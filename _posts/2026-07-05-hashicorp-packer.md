---
title: "HashiCorp Packer: 多平台镜像构建工具"
date: 2026-07-05 12:00:00 +0800
categories: [blog]
tags: [tools, packer]
excerpt: "HashiCorp Packer: 多平台镜像构建工具"
---

**HashiCorp Packer** 是一个开源的轻量级工具，用于从单一的源代码配置中为多个平台（如 AWS、Azure、VMware、Docker、VirtualBox 等）自动创建完全一致的**机器镜像（Machine Images）**。

在“基础设施即代码”（IaC）的生态中，Packer 负责“**构建（Build）**”阶段，即把操作系统、依赖库、安全补丁和应用代码打包成一个静态的镜像文件（如 AWS AMI、VMware Template）。

以下是从原理到实践的详细解读：

---

### 1. 核心原理与架构

Packer 的工作方式非常直观，它本质上是一个**自动化流水线**。

### 工作流程 (The Workflow)

当你运行 `packer build` 时，它会按顺序执行以下步骤：

1. **启动临时实例**：根据配置（如 AWS），Packer 会调用云厂商 API 启动一台临时的虚拟机（Source Machine）。
2. **连接实例**：通过 SSH（Linux）或 WinRM（Windows）连接到这台临时机器。
3. **配置环境 (Provisioning)**：这是核心步骤。Packer 会上传并执行脚本（Shell, PowerShell）或运行配置管理工具（Ansible, Chef, Puppet），在机器内部安装软件、修改配置、打补丁。
4. **清理与停机**：配置完成后，Packer 会清理临时文件（如 SSH Key、日志），然后关闭机器。
5. **生成镜像 (Snapshot/Export)**：调用云厂商 API 将这台已配置好的关机机器创建为镜像（如生成 AMI ID）。
6. **销毁资源**：删除第1步创建的临时实例和相关资源，只保留生成的镜像。

### 核心组件

- **Builders（构建器）**：
    - 定义镜像在哪创建。例如 `amazon-ebs`（AWS AMI）、`azure-arm`（Azure）、`vsphere-iso`（VMware）、`docker`。
- **Provisioners（配置器）**：
    - 定义镜像里装什么。常用：`shell`（运行脚本）、`file`（上传文件）、`ansible`（运行 Playbook）。
- **Post-Processors（后处理器）**：
    - 定义镜像创建后做什么。例如：上传到仓库、压缩、打标签、推送到 Vagrant Cloud。
- **Communicators（通信器）**：
    - 定义如何连接临时机器（SSH 或 WinRM）。

---

### 2. 为什么要用 Packer？（使用场景）

Packer 是实现 **不可变基础设施 (Immutable Infrastructure)** 的基石。

### A. 多云/混合云环境标准化

- **痛点**：你在 AWS 上用 AMI，在本地数据中心用 VMware 模板。维护两套完全不同的构建流程很痛苦。
- **Packer 解法**：用**同一个**配置文件（包含相同的 Ansible Playbook），同时生成 AWS AMI 和 VMware Template。保证云上云下环境 100% 一致。

### B. 加速部署与扩容 (Baking vs. Frying)

- **传统模式 (Frying)**：启动一个纯净 OS -> 运行脚本安装 Java/Nginx/App -> 服务启动。这在自动扩容（ASG）时太慢，可能需要几分钟。
- **Packer 模式 (Baking)**：提前用 Packer 把 Java/Nginx/App 甚至代码都打进镜像里。
- **结果**：新实例启动即用，启动时间从分钟级缩短到秒级。

### C. 提升稳定性与可回滚性

- 如果生产环境出问题，不要尝试 SSH 进去修修补补。直接回滚到上一个版本的镜像（Image Versioning）。
- 消除了“配置漂移”（Configuration Drift），即运行久了的服务器与初始状态不一致的问题。

### D. 安全合规 (DevSecOps)

- 可以在构建镜像的流程中加入安全扫描（如 Trivy, Inspector）。只有通过安全扫描的镜像才能发布。
- 产出的镜像可以经过安全加固（Hardening），且不包含 SSH 密钥和历史记录。

---

### 3. 使用示例 (HCL2 语法)

HashiCorp 现在推荐使用 **HCL2** (HashiCorp Configuration Language) 替代旧的 JSON 格式。HCL2 更灵活，支持变量和函数。

假设我们要创建一个安装了 Nginx 的 AWS Ubuntu 镜像：

`aws-ubuntu.pkr.hcl`:

```hcl
packer {
  required_plugins {
    amazon = {
      version = ">= 1.0.0"
      source  = "github.com/hashicorp/amazon"
    }
  }
}

variable "region" {
  type    = string
  default = "us-east-1"
}

# 1. 定义源镜像 (Builder)
source "amazon-ebs" "ubuntu" {
  ami_name      = "my-nginx-app-{{timestamp}}"
  instance_type = "t3.micro"
  region        = var.region

  # 基础镜像过滤器
  source_ami_filter {
    filters = {
      name                = "ubuntu/images/*ubuntu-jammy-22.04-amd64-server-*"
      root-device-type    = "ebs"
      virtualization-type = "hvm"
    }
    most_recent = true
    owners      = ["099720109477"] # Canonical
  }
  ssh_username = "ubuntu"
}

# 2. 构建流程 (Build block)
build {
  name = "learn-packer"
  sources = [
    "source.amazon-ebs.ubuntu"
  ]

  # 3. 配置环境 (Provisioner)
  provisioner "shell" {
    inline = [
      "echo 'Installing Nginx...'",
      "sleep 30",
      "sudo apt-get update",
      "sudo apt-get install -y nginx",
      "sudo systemctl enable nginx"
    ]
  }

  # 4. (可选) 安装完成后运行测试
  provisioner "shell" {
    inline = [
      "nginx -v"
    ]
  }
}

```

**运行命令：**

```bash
packer init .
packer validate .
packer build .

```

---

### 4. Packer 与 Terraform/Ansible 的关系

很多初学者容易混淆这三者，它们是互补关系：

1. **Packer (构建器)**：负责**打包**。它调用 Ansible 来配置系统，最后产出一个 **Artifact（镜像文件）**。
    - *产出物*：AMI ID (如 `ami-0abcdef123456`)。
2. **Ansible (配置器)**：负责**装修**。它被 Packer 调用，负责安装软件、修改配置文件。
3. **Terraform (部署器)**：负责**基础设施编排**。它引用 Packer 生成的 AMI ID，去创建 EC2 实例、负载均衡器、网络等。

**黄金链路**：
Git 代码提交 -> Jenkins 触发 Packer (调用 Ansible) -> 生成新 AMI -> Terraform 更新 Launch Template 版本 -> 触发滚动更新。

---

### 5. 最佳实践 (Best Practices)

### A. 镜像分层策略 (Layering)

不要把所有东西都塞进一个镜像，建议分层构建：

1. **Base Image (Foundation)**：
    - 内容：OS更新、安全加固（CIS Benchmark）、日志Agent、监控Agent、SSH配置。
    - 更新频率：月度更新（跟随OS补丁）。
2. **Middleware/Runtime Image**：
    - 基于 Base Image。
    - 内容：Java JDK, Python, Nginx, Docker 运行时。
    - 更新频率：季度或按需。
3. **Application Image (Golden Image)**：
    - 基于 Middleware Image。
    - 内容：应用程序代码（Jar包/二进制文件）、特定配置。
    - 更新频率：每次代码发布（CI/CD）。

### B. 自动化与 CI/CD

- 不要在开发人员笔记本上运行 `packer build`。
- 应该由 Jenkins/GitLab CI/GitHub Actions 运行。
- 使用 **HCP Packer (HashiCorp Cloud Platform)** 或简单的 S3/DynamoDB 来管理镜像元数据，追踪哪个 Git Commit 对应哪个 AMI ID。

### C. 不要硬编码密钥

- **严禁**在 Packer 模板中写死 `access_key` 和 `secret_key`。
- 如果是在 EC2 上运行 Packer，使用 IAM Role。
- 如果是本地运行，使用环境变量或 `~/.aws/credentials`。
- 对于镜像内部的敏感信息，通过 Vault 或 AWS Secrets Manager 在运行时获取，或者在 Packer 清理阶段彻底删除。

### D. 验证与测试

- 在生成 AMI 之前，使用 `provisioner` 运行简单的测试（如 `goss` 或 `inspec`）验证端口是否打开、服务是否安装。
- 如果测试失败，Packer 会自动终止构建，不会生成损坏的镜像。

### E. 清理历史镜像

- Packer 很容易产生大量旧的 AMI 和 EBS 快照，这都要钱。
- 编写 Lambda 脚本或使用工具定期根据标签（Tags）清理过期的 AMI 和对应的 Snapshots。

### 总结

HashiCorp Packer 是现代云原生架构中**标准化交付**的关键工具。如果你正在寻求从“手动运维”向“自动化运维”转型，或者希望实现“不可变基础设施”，Packer 是必经之路。
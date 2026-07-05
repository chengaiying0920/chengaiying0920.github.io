---
title: "eks版本升级"
date: 2025-12-23 14:28:00 +0800
categories: [blog]
tags: [aws, k8s, eks]
excerpt: "eks版本升级"
---

在 AWS EKS 生产环境进行版本升级（例如从 1.29 -> 1.30）是一项高风险操作，必须遵循**“控制平面不可逆，数据平面可回滚”**的原则。

以下是基于 2026 年 EKS 最佳实践整理的**最稳妥升级步骤**及**应急预案**。

---

### 核心原则 (黄金法则)

1. **循序渐进**：只能逐个次版本升级（例如 1.29 -> 1.30），**严禁跨版本**（如 1.29 -> 1.31）。
2. **木桶效应**：控制平面（Control Plane）升级后**无法降级**。一旦点击升级，就没有回头路，因此“升级前的检查”比“升级操作”更重要。
3. **顺序**：控制平面 -> 插件 (Add-ons) -> 数据平面 (Nodes)。

---

### 第一阶段：升级前准备 (Pre-flight Checks) —— 最关键的一步

如果这步没做好，后面就是灾难。

### 1. API 废弃检查 (必做)

Kubernetes 每个版本都会移除旧的 API（如 `v1beta1`）。如果你的应用 Helm Chart 或 YAML 里还在用旧 API，升级后这些应用将**无法部署**。

- **工具推荐**：使用 **`kubent` (Kube No Trouble)** 或 **`pluto`**。
- **操作**：
    
    ```bash
    # 在集群中运行检测
    sh -c "$(curl -sSL <https://git.io/install-kubent>)"
    kubent
    
    ```
    
- **动作**：修复所有报告为 `DEPRECATED` 或 `REMOVED` 的资源。

### 2. 检查 IP 地址余量

升级过程中，新节点启动需要占用新的 IP 地址（EKS 默认是滚动更新）。

- **检查**：VPC 子网中是否有足够的可用 IP？建议至少预留 **(当前节点数 * 20%)** 的空闲 IP。

### 3. 备份数据

- **Etcd/资源备份**：使用 **Velero** 备份集群所有资源清单（Manifests）。
- **数据库**：如果集群内运行有状态服务（RDS通常在外部，不受影响），请手动创建快照。

### 4. 升级客户端工具

- 更新本地的 `kubectl` 和 `aws-cli` 到与目标版本匹配的版本。

---

### 第二阶段：执行升级 (Execution)

### 步骤 1：升级控制平面 (Control Plane)

这是 AWS 托管的部分。

- **操作**：在 AWS Console 点击 "Upgrade version" 或使用 AWS CLI。
    
    ```bash
    aws eks update-cluster-version --name <cluster_name> --kubernetes-version <new_version>
    
    ```
    
- **耗时**：通常需要 30-60 分钟。
- **影响**：
    - API Server 可能会有短暂的连接中断（几秒钟），重试即可。
    - **现有的 Pod 和节点不会受影响，业务流量正常。**

### 步骤 2：升级核心插件 (Add-ons)

控制平面升级完后，必须立刻升级核心组件，否则可能导致新节点无法加入或网络异常。

- **核心组件**：
    1. **VPC CNI** (aws-node)
    2. **CoreDNS**
    3. **Kube-proxy**
- **操作**：
    - 如果是 EKS Managed Add-ons：在 Console 上直接点 Edit 选择新版本。
    - 如果是自管：应用新的 YAML 清单。

### 步骤 3：升级数据平面 (Worker Nodes)

这是业务感知的阶段。你需要替换旧节点为新版本的 AMI。

**场景 A：使用 Managed Node Groups (推荐)**

- **操作**：更改节点组的 Launch Template 版本或直接在 Console 点击升级。
- **策略**：EKS 会自动执行“滚动替换”：启动新节点 -> 等待 Ready -> 驱逐旧节点 (Drain) -> 终止旧节点。
- **稳妥技巧**：
    - 确保你的应用配置了 **PDB (Pod Disruption Budget)**，防止滚动更新时把所有副本都杀掉。
    - 确保配置了 **HPA** 和 **Readiness Probe**。

**场景 B：使用 Karpenter (2026 主流)**

- **操作**：修改 `EC2NodeClass` 中的 AMI 筛选条件（例如 Family 或 ID），然后通过 `kubectl delete node` 逐步触发 Karpenter 的漂移检测（Drift）或手动轮转。

---

### 第三阶段：升级后验证

1. **检查节点状态**：`kubectl get nodes` 确保所有节点版本已更新，且状态为 Ready。
2. **检查应用日志**：抽查核心业务 Pod，确保没有网络连接错误（CNI 升级问题通常表现为网络不通）。
3. **AWS Load Balancer Controller**：检查 Ingress 是否能正常 reconcile。

---

### ⚠️ 应急预案 (Emergency Plan)

根据故障发生的阶段，采取不同的救援措施。

### 场景 1：控制平面 (Control Plane) 升级失败

- **现象**：AWS Console 显示升级失败，状态回滚。
- **应对**：
    - 无需操作。AWS EKS 的控制平面升级是原子操作，如果 AWS 侧升级失败，它会自动回滚到旧版本。
    - **联系 AWS Support** 获取失败原因（通常是 IAM 权限或子网 IP 不足）。

### 场景 2：控制平面升级成功，但应用报错 (API 版本不兼容)

- **现象**：Deployment 无法更新，报错 `no matches for kind "Deployment" in version "extensions/v1beta1"`。
- **应对**：
    - **不可降级控制平面**。
    - **修复**：必须立即修改应用的 YAML/Helm Chart，将 `apiVersion` 改为新版本支持的格式，然后重新 Apply。
    - *这就是为什么第一阶段的 kubent 检查至关重要。*

### 场景 3：节点组升级失败 / 新节点无法加入集群

- **现象**：新节点启动了但无法 Ready，或者应用调度过去后 Crash。
- **应对 (可回滚)**：
    - **立即停止升级**。
    - **回滚节点组**：在 AWS Console 将 Managed Node Group 的版本改回旧版本 AMI。
    - **扩容旧节点**：手动增加旧版本节点组的大小，确保业务有地方跑。

### 场景 4：核心插件 (CNI/CoreDNS) 升级导致网络瘫痪

- **现象**：Pod 无法解析域名，或者无法分配 IP。
- **应对**：
    - 使用 `kubectl` 将 Add-on 的镜像版本 **Rollback** 回旧版本。
    - 例如，如果 VPC CNI v1.18 出问题，手动 Apply v1.17 的 Manifest。

### 场景 5：灾难性故障 (集群彻底不可用)

如果因为极端原因（如 Etcd 数据损坏，极罕见）导致集群彻底挂了。

- **应对**：
    - **启用 Blue/Green 切换**（如果你有备用集群）：将 DNS/CDN 流量切到备用集群（DR Cluster）。
    - **Velero 恢复**：在一个新的 EKS 集群上，使用 Velero 从 S3 备份中恢复所有资源配置。

---

### 总结：最稳妥的“保命”清单

1. **必须跑 `kubent`**：消灭所有 API 废弃警告。
2. **PDB 是护身符**：确保业务 Pod 不会被一次性杀光。
3. **节点分批升级**：不要一次性升级所有节点组。先升级非核心业务的节点组，观察 24 小时，再升级核心节点组。
4. **业务低峰期执行**：尽量选择流量低谷进行节点轮转。
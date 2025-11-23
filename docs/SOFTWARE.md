# Software & Application Stack

This document describes the core software stack and the catalog of applications to be deployed on the homelab.

## Core Infrastructure

| Component     | Technology       | Version | Purpose                                  |
| ------------- | ---------------- | ------- | ---------------------------------------- |
| **Hypervisor**| Proxmox VE       | TBD     | Virtual machine and container management |
| **Orchestration** | HashiCorp Terraform | TBD | Infrastructure as Code provisioning      |
| **Kubernetes**  | k3s              | TBD     | Lightweight Kubernetes distribution    |

## Application Catalog

This is the list of primary applications to be deployed on the Kubernetes cluster.

| Application       | Description                            | Deployment Method |
| ----------------- | -------------------------------------- | ----------------- |
| **Home Assistant**| Home automation hub                    | Helm Chart        |
| **n8n**           | Workflow automation                    | Helm Chart        |
| **Grafana**       | Monitoring and observability dashboard | Helm Chart        |
| **Prometheus**    | Metrics and alerting                   | Helm Chart        |
| **Docker Registry**| Private container image storage        | Helm Chart        |
| **(Other)**       | TBD                                    | TBD               |

## GitOps

| Component | Technology | Purpose                                        |
| --------- | ---------- | ---------------------------------------------- |
| **GitOps Controller** | TBD (FluxCD or ArgoCD) | Continuous deployment for Kubernetes apps |

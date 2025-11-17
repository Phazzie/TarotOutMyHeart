# AI Coordination Server - Monitoring Guide

This guide explains how to set up and use Prometheus and Grafana to monitor the AI Coordination Server.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Setting Up Prometheus](#setting-up-prometheus)
- [Setting Up Grafana](#setting-up-grafana)
- [Available Metrics](#available-metrics)
- [Example Queries](#example-queries)
- [Alerting Recommendations](#alerting-recommendations)
- [Troubleshooting](#troubleshooting)

---

## Overview

The AI Coordination Server exposes Prometheus metrics at the `/metrics` endpoint. These metrics track:

- **Task performance**: Completion rates, durations, failures
- **Agent availability**: Claude Code and GitHub Copilot status
- **API performance**: Request rates, response times, error rates
- **Resource utilization**: Active locks, WebSocket connections, sessions
- **System health**: Node.js metrics (CPU, memory, event loop)

---

## Prerequisites

- **Docker** (recommended) or local Prometheus/Grafana installations
- **AI Coordination Server** running on `http://localhost:3456`
- Basic understanding of Prometheus and Grafana

---

## Setting Up Prometheus

### Using Docker

1. **Create a Prometheus configuration file** `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s     # Scrape targets every 15 seconds
  evaluation_interval: 15s # Evaluate rules every 15 seconds

scrape_configs:
  - job_name: 'ai-coordination-server'
    static_configs:
      - targets: ['host.docker.internal:3456']  # Use this for Docker on Mac/Windows
        # - targets: ['172.17.0.1:3456']        # Use this for Docker on Linux
        labels:
          service: 'coordination-server'
          environment: 'development'
```

2. **Run Prometheus container**:

```bash
docker run -d \
  --name prometheus \
  -p 9090:9090 \
  -v $(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus
```

3. **Verify Prometheus is scraping metrics**:
   - Open http://localhost:9090
   - Go to **Status > Targets**
   - Verify `ai-coordination-server` target is **UP**

### Using Local Installation

1. **Install Prometheus**:

```bash
# macOS
brew install prometheus

# Linux
wget https://github.com/prometheus/prometheus/releases/download/v2.45.0/prometheus-2.45.0.linux-amd64.tar.gz
tar xvfz prometheus-*.tar.gz
cd prometheus-*
```

2. **Edit `prometheus.yml`**:

```yaml
scrape_configs:
  - job_name: 'ai-coordination-server'
    static_configs:
      - targets: ['localhost:3456']
```

3. **Start Prometheus**:

```bash
prometheus --config.file=prometheus.yml
```

4. **Access Prometheus UI**: http://localhost:9090

---

## Setting Up Grafana

### Using Docker

1. **Run Grafana container**:

```bash
docker run -d \
  --name grafana \
  -p 3000:3000 \
  grafana/grafana
```

2. **Access Grafana**: http://localhost:3000
   - Default login: `admin` / `admin` (you'll be prompted to change)

3. **Add Prometheus data source**:
   - Go to **Configuration > Data Sources > Add data source**
   - Select **Prometheus**
   - URL: `http://host.docker.internal:9090` (Mac/Windows) or `http://172.17.0.1:9090` (Linux)
   - Click **Save & Test**

4. **Import the AI Coordination Server dashboard**:
   - Go to **Dashboards > Import**
   - Click **Upload JSON file**
   - Select `grafana/coordination-dashboard.json` from this repository
   - Select your Prometheus data source
   - Click **Import**

### Using Local Installation

1. **Install Grafana**:

```bash
# macOS
brew install grafana

# Linux - see https://grafana.com/docs/grafana/latest/setup-grafana/installation/
```

2. **Start Grafana**:

```bash
# macOS
brew services start grafana

# Linux
sudo systemctl start grafana-server
```

3. **Follow steps 2-4 from Docker installation above**

---

## Available Metrics

### Counter Metrics

| Metric | Description | Labels |
|--------|-------------|--------|
| `coordination_server_task_completions_total` | Total tasks completed | `status` (success/failure), `agent` |
| `coordination_server_task_failures_total` | Total task failures | `reason`, `agent` |
| `coordination_server_api_requests_total` | Total API requests | `method`, `endpoint`, `status_code` |
| `coordination_server_file_conflicts_total` | Total file conflicts | `resolution` (auto/manual/failed) |
| `coordination_server_agent_registrations_total` | Total agent registrations | `agent` |
| `coordination_server_handoff_requests_total` | Total handoff requests | `from_agent`, `to_agent`, `status` |
| `coordination_server_context_operations_total` | Total context operations | `operation` (save/retrieve), `status` |

### Gauge Metrics

| Metric | Description | Labels |
|--------|-------------|--------|
| `coordination_server_active_tasks` | Current active tasks | `agent`, `status` |
| `coordination_server_active_locks` | Current active file locks | `agent` |
| `coordination_server_websocket_connections` | Current WebSocket connections | `type` (client/agent) |
| `coordination_server_agent_availability` | Agent availability (1=available) | `agent`, `state` |
| `coordination_server_pending_tasks` | Current pending tasks | `priority` |
| `coordination_server_active_sessions` | Current active collaboration sessions | - |

### Histogram Metrics

| Metric | Description | Labels |
|--------|-------------|--------|
| `coordination_server_api_response_time_seconds` | API response time distribution | `method`, `endpoint` |
| `coordination_server_task_duration_seconds` | Task duration distribution | `agent`, `task_type` |
| `coordination_server_lock_acquisition_time_seconds` | Lock acquisition time | `agent` |
| `coordination_server_context_size_bytes` | Context data size | `operation` |

### Default Node.js Metrics

All metrics prefixed with `coordination_server_`:
- `process_cpu_*` - CPU usage
- `process_resident_memory_bytes` - Memory usage
- `nodejs_eventloop_lag_*` - Event loop lag
- `nodejs_gc_duration_seconds` - Garbage collection duration

---

## Example Queries

### Task Performance

**Task completion rate (per second)**:
```promql
rate(coordination_server_task_completions_total[5m])
```

**Task success rate (%)**:
```promql
100 * sum(rate(coordination_server_task_completions_total{status="success"}[5m]))
    / sum(rate(coordination_server_task_completions_total[5m]))
```

**Average task duration (p95)**:
```promql
histogram_quantile(0.95,
  rate(coordination_server_task_duration_seconds_bucket[5m])
)
```

**Tasks by agent**:
```promql
sum by (agent) (coordination_server_active_tasks)
```

### API Performance

**API request rate (requests per minute)**:
```promql
sum(rate(coordination_server_api_requests_total[1m])) * 60
```

**API latency p99**:
```promql
histogram_quantile(0.99,
  rate(coordination_server_api_response_time_seconds_bucket[5m])
)
```

**Error rate (%)**:
```promql
100 * sum(rate(coordination_server_api_requests_total{status_code!~"2.."}[5m]))
    / sum(rate(coordination_server_api_requests_total[5m]))
```

**Requests by endpoint**:
```promql
sum by (endpoint) (rate(coordination_server_api_requests_total[5m]))
```

### Agent Monitoring

**Agent availability**:
```promql
coordination_server_agent_availability{state="available"}
```

**Agents currently busy**:
```promql
coordination_server_agent_availability{state="busy"}
```

**Agent registration rate**:
```promql
rate(coordination_server_agent_registrations_total[1h])
```

### Resource Utilization

**Active file locks**:
```promql
sum by (agent) (coordination_server_active_locks)
```

**WebSocket connections**:
```promql
sum by (type) (coordination_server_websocket_connections)
```

**Lock contention (time to acquire lock)**:
```promql
histogram_quantile(0.95,
  rate(coordination_server_lock_acquisition_time_seconds_bucket[5m])
)
```

### System Health

**Memory usage**:
```promql
coordination_server_process_resident_memory_bytes / 1024 / 1024
```

**Event loop lag (ms)**:
```promql
coordination_server_nodejs_eventloop_lag_seconds * 1000
```

**CPU usage**:
```promql
rate(coordination_server_process_cpu_user_seconds_total[1m])
```

---

## Alerting Recommendations

### Critical Alerts

**High Error Rate**
```yaml
alert: HighAPIErrorRate
expr: |
  100 * sum(rate(coordination_server_api_requests_total{status_code!~"2.."}[5m]))
      / sum(rate(coordination_server_api_requests_total[5m])) > 5
for: 2m
labels:
  severity: critical
annotations:
  summary: "High API error rate ({{ $value }}%)"
  description: "More than 5% of API requests are failing"
```

**Service Down**
```yaml
alert: CoordinationServerDown
expr: up{job="ai-coordination-server"} == 0
for: 1m
labels:
  severity: critical
annotations:
  summary: "AI Coordination Server is down"
  description: "The coordination server is not responding to Prometheus scrapes"
```

**High Task Failure Rate**
```yaml
alert: HighTaskFailureRate
expr: |
  100 * sum(rate(coordination_server_task_failures_total[5m]))
      / sum(rate(coordination_server_task_completions_total[5m])) > 20
for: 5m
labels:
  severity: critical
annotations:
  summary: "High task failure rate ({{ $value }}%)"
  description: "More than 20% of tasks are failing"
```

### Warning Alerts

**High API Latency**
```yaml
alert: HighAPILatency
expr: |
  histogram_quantile(0.95,
    rate(coordination_server_api_response_time_seconds_bucket[5m])
  ) > 1
for: 5m
labels:
  severity: warning
annotations:
  summary: "High API latency ({{ $value }}s)"
  description: "95th percentile API response time is above 1 second"
```

**Lock Contention**
```yaml
alert: HighLockContention
expr: coordination_server_active_locks > 10
for: 5m
labels:
  severity: warning
annotations:
  summary: "High number of file locks ({{ $value }})"
  description: "Many files are locked, potential contention issue"
```

**Memory Usage**
```yaml
alert: HighMemoryUsage
expr: |
  coordination_server_process_resident_memory_bytes / 1024 / 1024 / 1024 > 1
for: 5m
labels:
  severity: warning
annotations:
  summary: "High memory usage ({{ $value }}GB)"
  description: "Memory usage is above 1GB"
```

**Event Loop Lag**
```yaml
alert: HighEventLoopLag
expr: coordination_server_nodejs_eventloop_lag_seconds > 0.1
for: 2m
labels:
  severity: warning
annotations:
  summary: "High event loop lag ({{ $value }}s)"
  description: "Node.js event loop is lagging, server may be overloaded"
```

---

## Troubleshooting

### Metrics not showing up

1. **Verify server is running**:
   ```bash
   curl http://localhost:3456/health
   ```

2. **Check metrics endpoint**:
   ```bash
   curl http://localhost:3456/metrics
   ```
   You should see Prometheus-formatted metrics.

3. **Check Prometheus targets**:
   - Open http://localhost:9090/targets
   - Ensure `ai-coordination-server` is **UP**
   - If **DOWN**, check network connectivity and server address

4. **Check Prometheus logs**:
   ```bash
   docker logs prometheus
   ```

### Dashboard shows "No Data"

1. **Verify data source is configured correctly**:
   - Grafana > Configuration > Data Sources
   - Test connection to Prometheus

2. **Check time range**:
   - Dashboard time range (top right)
   - Ensure it covers when server was running

3. **Check metric names**:
   - Grafana > Explore
   - Try a simple query like `up{job="ai-coordination-server"}`

### Metrics are outdated

1. **Check scrape interval**:
   - Prometheus config: `scrape_interval: 15s`
   - Dashboard refresh: Set to auto-refresh (5s, 10s, etc.)

2. **Verify server is still running**:
   ```bash
   curl http://localhost:3456/health
   ```

### High memory usage in Prometheus

1. **Reduce retention period**:
   ```bash
   --storage.tsdb.retention.time=7d  # Keep 7 days instead of default 15d
   ```

2. **Reduce scrape interval**:
   ```yaml
   scrape_interval: 30s  # Instead of 15s
   ```

3. **Limit metric cardinality**:
   - Avoid high-cardinality labels (IDs, timestamps, etc.)
   - Use aggregation in queries instead of storing all label combinations

---

## Advanced Configuration

### Custom Alerts

Create an `alerts.yml` file:

```yaml
groups:
  - name: ai_coordination_server
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: |
          100 * sum(rate(coordination_server_api_requests_total{status_code!~"2.."}[5m]))
              / sum(rate(coordination_server_api_requests_total[5m])) > 5
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate: {{ $value }}%"
```

Add to Prometheus config:

```yaml
rule_files:
  - alerts.yml

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['localhost:9093']  # Alertmanager address
```

### Prometheus Configuration Best Practices

```yaml
global:
  scrape_interval: 15s      # Balance between freshness and load
  evaluation_interval: 15s  # How often to evaluate rules

scrape_configs:
  - job_name: 'ai-coordination-server'
    scrape_interval: 10s    # Override global for this job
    scrape_timeout: 5s      # Timeout for scrape requests
    metrics_path: /metrics  # Metrics endpoint path
    static_configs:
      - targets: ['localhost:3456']
        labels:
          service: 'coordination-server'
          environment: 'production'
          region: 'us-west-2'
```

---

## Additional Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [PromQL Basics](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Grafana Dashboard Best Practices](https://grafana.com/docs/grafana/latest/dashboards/build-dashboards/best-practices/)

---

## Support

For issues or questions:
- Check the [Troubleshooting](#troubleshooting) section
- Review server logs: `docker logs coordination-server`
- Open an issue on the project repository

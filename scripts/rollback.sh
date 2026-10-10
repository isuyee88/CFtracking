#!/bin/bash
# Worker Rollback Script
# Worker 回滚脚本

set -e

echo "=== CF-Tracking Worker Rollback Script ==="
echo ""

# 配置
WORKER_NAME="cf-tracking-v2"
HEALTH_URL="https://cf-tracking-v2.suyee88.workers.dev/health"
DEPLOYMENT_INFO_URL="https://cf-tracking-v2.suyee88.workers.dev/api/deployment/info"

# 颜色
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 函数：打印成功消息
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# 函数：打印错误消息
error() {
    echo -e "${RED}❌ $1${NC}"
}

# 函数：打印警告消息
warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 函数：健康检查
health_check() {
    echo "Checking Worker health..."
    
    HEALTH_RESPONSE=$(curl -s "$HEALTH_URL")
    HEALTH_STATUS=$(echo "$HEALTH_RESPONSE" | jq -r '.data.status' 2>/dev/null || echo "error")
    
    if [ "$HEALTH_STATUS" = "healthy" ]; then
        success "Worker is healthy"
        return 0
    else
        error "Worker is not healthy: $HEALTH_STATUS"
        return 1
    fi
}

# 函数：获取当前版本
get_current_version() {
    echo "Getting current deployment version..."
    
    VERSION_RESPONSE=$(curl -s "$DEPLOYMENT_INFO_URL")
    VERSION=$(echo "$VERSION_RESPONSE" | jq -r '.data.version' 2>/dev/null || echo "unknown")
    
    echo "Current version: $VERSION"
    echo "$VERSION"
}

# 函数：列出部署历史
list_deployments() {
    echo "Listing deployment history..."
    npx wrangler deployments list --name "$WORKER_NAME"
}

# 函数：执行回滚
perform_rollback() {
    local message="$1"
    
    echo ""
    warning "⚠️  ATTENTION: About to rollback $WORKER_NAME"
    echo "Reason: $message"
    echo ""
    read -p "Are you sure you want to continue? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        error "Rollback cancelled by user"
        exit 1
    fi
    
    echo "Performing rollback..."
    npx wrangler rollback "$WORKER_NAME" --message "$message"
    
    if [ $? -eq 0 ]; then
        success "Rollback command executed successfully"
    else
        error "Rollback command failed"
        exit 1
    fi
}

# 函数：验证回滚
verify_rollback() {
    echo ""
    echo "Verifying rollback..."
    sleep 3
    
    # 健康检查
    if health_check; then
        success "Health check passed"
    else
        error "Health check failed after rollback"
        return 1
    fi
    
    # 版本检查
    NEW_VERSION=$(get_current_version)
    
    if [ "$NEW_VERSION" != "$OLD_VERSION" ]; then
        success "Version changed: $OLD_VERSION → $NEW_VERSION"
    else
        warning "Version appears unchanged"
    fi
    
    echo ""
    success "Rollback verification complete"
}

# 主流程
main() {
    echo "Step 1: Recording current state..."
    OLD_VERSION=$(get_current_version)
    
    echo ""
    echo "Step 2: Checking current health..."
    health_check || warning "Current deployment has issues"
    
    echo ""
    echo "Step 3: Listing deployment history..."
    list_deployments
    
    echo ""
    echo "Step 4: Performing rollback..."
    ROLLBACK_REASON="${1:-Emergency rollback}"
    perform_rollback "$ROLLBACK_REASON"
    
    echo ""
    echo "Step 5: Verifying rollback..."
    if verify_rollback; then
        echo ""
        success "=== Rollback completed successfully ==="
        echo ""
        echo "Old version: $OLD_VERSION"
        echo "New version: $NEW_VERSION"
        echo ""
        echo "Next steps:"
        echo "1. Monitor Worker performance"
        echo "2. Check error logs"
        echo "3. Notify team about rollback"
        echo "4. Create incident report"
        echo "5. Fix the issue in the rolled-back version"
    else
        error "=== Rollback verification failed ==="
        echo ""
        echo "Immediate actions required:"
        echo "1. Check Worker logs: npx wrangler tail $WORKER_NAME"
        echo "2. Review deployment history"
        echo "3. Consider manual intervention"
        exit 1
    fi
}

# 帮助信息
show_help() {
    echo "Usage: $0 [ROLLBACK_REASON]"
    echo ""
    echo "Examples:"
    echo "  $0 \"Bug in bulk operations\""
    echo "  $0 \"Performance degradation\""
    echo "  $0"
    echo ""
    echo "If no reason is provided, 'Emergency rollback' will be used."
}

# 参数处理
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    show_help
    exit 0
fi

# 执行主流程
main "$@"

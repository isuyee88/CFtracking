/**
 * SSR 环境变量声明
 * 所有以 __SSR_* 命名的变量都将在服务端渲染阶段注入
 */
declare namespace ImportMetaEnv {
  interface SSR {
    /** 后端 API 基础地址（仅在 SSR 环境可用） */
    __SSR_API_URL__?: string;
    /** 其它服务端专用变量可继续扩展 */
    // __SSR_ANOTHER_VAR__?: string;
  }
}
/**
 * @fileoverview React Router v7 Root 入口
 * @description 应用根组件，定义 HTML 结构和全局布局
 * @module root
 * 
 * 参考：https://reactrouter.com/upgrading/component-routes#3-add-the-root-entry-point
 */

import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import type { LinksFunction } from "react-router";

import indexCss from "./index.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: indexCss },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  { rel: "preload", href: indexCss, as: "style" },
];

export const meta = () => [
  { charSet: "utf-8" },
  { name: "viewport", content: "width=device-width, initial-scale=1" },
  { name: "theme-color", content: "#ffffff" },
  { name: "description", content: "CF Tracking - Real-time tracking and analytics dashboard" },
];

export function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>CF Tracking</title>
        <Meta />
        <Links />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const savedTheme = localStorage.getItem('dark-mode');
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                const hour = new Date().getHours();
                const isNightTime = hour >= 18 || hour < 6;
                
                let isDarkMode = false;
                if (savedTheme !== null) {
                  isDarkMode = savedTheme === 'true';
                } else {
                  isDarkMode = isNightTime || prefersDark;
                }
                
                if (isDarkMode) {
                  document.documentElement.classList.add('dark-mode');
                  document.documentElement.style.backgroundColor = '#0c0e10';
                  document.documentElement.style.color = '#e2e2e5';
                }
              })();
            `,
          }}
        />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function Root() {
  return <Outlet />;
}

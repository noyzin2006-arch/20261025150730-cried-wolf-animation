#!/usr/bin/env node
/**
 * 本机静态服务器（scripts/serve.mjs）
 *
 * 职责：
 *   - 只服务 dist/ 下的固定白名单文件，绝不暴露源码目录、.cache/、handoff/、reports/、node_modules/、.git/。
 *   - 只绑定 127.0.0.1（绝不绑 0.0.0.0）。
 *   - 拒绝一切路径穿越（..、%2e%2e、编码后的 ../、绝对路径、反斜杠），穿越尝试返回 404 而不是 500。
 *   - 显式 MIME。
 *   - 可被 export-video.mjs / audit-browser.mjs 以 ESM 导入的方式复用（startServer）。
 *
 * 用法：
 *   node scripts/serve.mjs [--port 4173] [--root dist]
 *   import { startServer } from './serve.mjs';
 *   const { url, close } = await startServer({ port: 0 });
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** 白名单：/src/ 下允许被服务的 9 个脚本文件名（构建产物固定集合）。 */
export const SRC_JS_FILES = Object.freeze([
  'tokens.js',
  'story-data.js',
  'geometry.js',
  'timeline.js',
  'scene.js',
  'audio-player.js',
  'icons.js',
  'ui.js',
  'main.js',
]);

/** 显式 MIME 表：只认这四种扩展名，其余一律 404。 */
const MIME_BY_EXT = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.m4a': 'audio/mp4',
});

/** 默认监听参数：只绑回环地址。 */
export const DEFAULT_HOST = '127.0.0.1';
export const DEFAULT_PORT = 4173;

/** 仓库根：scripts/ 的上一级。 */
export const REPO_ROOT = path.resolve(HERE, '..');

/** dist 目录：只服务构建产物。 */
export function defaultRoot() {
  return path.join(REPO_ROOT, 'dist');
}

/**
 * 路径穿越/非法路径判定。
 * 命中任何一条都视为非法（返回 404，不进入文件读取）。
 */
export function isUnsafePath(rawPath) {
  if (typeof rawPath !== 'string' || rawPath.length === 0) return true;
  if (rawPath.includes('\0')) return true;
  if (rawPath.includes('\\')) return true; // 反斜杠（含 Windows 盘符 C:\...）
  // 原始串里的编码痕迹：%2e(.) / %2f(/) / %5c(\)
  const lower = rawPath.toLowerCase();
  if (lower.includes('%2e')) return true;
  if (lower.includes('%2f')) return true;
  if (lower.includes('%5c')) return true;
  if (lower.includes('%00')) return true;
  // 未编码的 ..
  if (lower.includes('..')) return true;
  // 协议相对 / UNC
  if (rawPath.startsWith('//')) return true;
  // 解码后再查一遍（双层编码、%252e 等）
  let decoded;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    return true; // 非法百分号编码
  }
  if (decoded.includes('\0')) return true;
  if (decoded.includes('\\')) return true;
  if (decoded.includes('..')) return true;
  if (decoded.startsWith('//')) return true;
  // 绝对路径形态（/etc/passwd 之类靠白名单拦；这里额外拦盘符）
  if (/^[a-zA-Z]:/.test(decoded)) return true;
  return false;
}

/**
 * 把请求路径映射到白名单内的相对文件路径；不在白名单返回 null。
 * 注意：映射只依赖固定字符串比较，不做任何路径拼接推导，因此不存在穿越面。
 */
export function resolveRoute(pathname) {
  if (pathname === '/' || pathname === '/index.html') return 'index.html';
  if (pathname === '/single.html') return 'single.html';
  if (pathname === '/styles/main.css') return path.join('styles', 'main.css');
  if (pathname === '/assets/score.m4a') return path.join('assets', 'score.m4a');
  if (pathname.startsWith('/src/')) {
    const name = pathname.slice('/src/'.length);
    if (SRC_JS_FILES.includes(name)) return path.join('src', name);
    return null;
  }
  return null;
}

function send404(req, res, quiet) {
  res.writeHead(404, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end('404 Not Found\n');
  if (!quiet) process.stderr.write(`[serve] 404 ${req.method} ${req.url}\n`);
}

/**
 * 启动服务器。
 * @param {{port?:number, root?:string, host?:string, quiet?:boolean}} options
 * @returns {Promise<{url:string, port:number, root:string, close:()=>Promise<void>}>}
 */
export function startServer(options = {}) {
  const {
    port = DEFAULT_PORT,
    root = defaultRoot(),
    host = DEFAULT_HOST,
    quiet = false,
  } = options;

  if (host !== '127.0.0.1' && host !== 'localhost' && host !== '::1') {
    return Promise.reject(new Error(`[serve] 拒绝绑定非回环地址：${host}`));
  }

  const rootDir = path.resolve(root);
  const sockets = new Set();

  const server = http.createServer((req, res) => {
    let pathname;
    try {
      pathname = new URL(req.url ?? '/', `http://${host}:${port}`).pathname;
    } catch {
      send404(req, res, quiet);
      return;
    }

    // 1) 路径穿越 / 非法路径 → 404
    if (isUnsafePath(pathname)) {
      send404(req, res, quiet);
      return;
    }

    // 2) 方法限制
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('405 Method Not Allowed\n');
      if (!quiet) process.stderr.write(`[serve] 405 ${req.method} ${req.url}\n`);
      return;
    }

    // 3) 白名单映射
    const rel = resolveRoute(pathname);
    if (!rel) {
      send404(req, res, quiet);
      return;
    }

    const filePath = path.join(rootDir, rel);
    // 4) 双保险：解析后的绝对路径必须仍在 root 之内
    if (filePath !== rootDir && !filePath.startsWith(rootDir + path.sep)) {
      send404(req, res, quiet);
      return;
    }

    fs.stat(filePath, (err, stat) => {
      if (err || !stat.isFile()) {
        send404(req, res, quiet);
        return;
      }
      const mime = MIME_BY_EXT[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': mime,
        'Content-Length': stat.size,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      if (req.method === 'HEAD') {
        res.end();
        return;
      }
      const stream = fs.createReadStream(filePath);
      stream.on('error', () => {
        res.destroy();
      });
      stream.pipe(res);
      if (!quiet) process.stderr.write(`[serve] 200 ${req.method} ${pathname}\n`);
    });
  });

  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      server.removeListener('error', reject);
      const actual = server.address();
      const actualPort = typeof actual === 'object' && actual ? actual.port : port;
      const close = () =>
        new Promise((resolveClose) => {
          for (const socket of sockets) socket.destroy();
          sockets.clear();
          server.close(() => resolveClose());
        });
      resolve({
        url: `http://${host}:${actualPort}/`,
        port: actualPort,
        root: rootDir,
        close,
      });
    });
  });
}

/** 直接运行时才起服务（被 import 时不自动监听）。 */
async function main() {
  const argv = process.argv.slice(2);
  const readFlag = (name, fallback) => {
    const i = argv.indexOf(name);
    if (i !== -1 && argv[i + 1] !== undefined) return argv[i + 1];
    const inline = argv.find((a) => a.startsWith(`${name}=`));
    if (inline) return inline.slice(name.length + 1);
    return fallback;
  };

  const port = Number(readFlag('--port', DEFAULT_PORT));
  const root = path.resolve(REPO_ROOT, readFlag('--root', 'dist'));

  const server = await startServer({ port, root, quiet: false });
  process.stdout.write(`[serve] 监听 ${server.url}（root=${server.root}）\n`);

  let closing = false;
  const shutdown = async (signal) => {
    if (closing) return;
    closing = true;
    process.stdout.write(`[serve] 收到 ${signal}，正在优雅退出\n`);
    await server.close();
    process.exit(0);
  };
  process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
  process.on('SIGINT', () => { void shutdown('SIGINT'); });
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  main().catch((err) => {
    process.stderr.write(`[serve] 启动失败：${err?.message ?? err}\n`);
    process.exit(1);
  });
}

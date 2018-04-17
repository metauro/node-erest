/**
 * @file API Utils
 * @author Yourtion Guo <yourtion@gmail.com>
 */
import { resolve as pathResolve } from "path";
import { IKVObject, IPromiseCallback } from "./interfaces";

export interface ISourceResult {
  relative?: string;
  absolute?: string;
}

/**
 * 获取调用当前函数的源码地址
 *
 * @param {String} dir 项目所在目录
 * @return {Object} 返回调用堆栈中第一个项目所在目录的文件
 */
export function getCallerSourceLine(dir: string): ISourceResult {
  const resolvedDir = pathResolve(dir);
  const err = new Error().stack;
  const stack = err ? err.split("\n").slice(1) : "";
  for (let line of stack) {
    line = line.trim();
    if (line.replace(/\\/g, "/").indexOf(resolvedDir) !== -1) {
      const s = line.match(/\((.*)\)\s*$/);
      if (s) {
        return {
          relative: s[1].slice(resolvedDir.length + 1),
          absolute: s[1],
        };
      }
    }
  }
  return { relative: undefined, absolute: undefined };
}

/**
 * 获取API的Key
 *
 * @param {String} method
 * @param {String} path
 * @return {String}
 */
export function getSchemaKey(method: string, path: string, group?: string): string {
  return `${group ? group + "_" : ""}${method.toUpperCase()}_${path}`;
}

/**
 * 返回安全的JSON字符串
 *
 * @param {Object} data
 * @param {String|Number} space 缩进
 * @return {String}
 */
export function jsonStringify(data: object, space: string | number) {
  const seen: any[] = [];
  return JSON.stringify(
    data,
    (key, val) => {
      if (!val || typeof val !== "object") {
        return val;
      }
      if (seen.indexOf(val) !== -1) {
        return "[Circular]";
      }
      seen.push(val);
      return val;
    },
    space,
  );
}

/**
 * 创建一个带 promise 的回调函数
 *
 * @return {Function}
 */
export function createPromiseCallback<T>(): IPromiseCallback<T> {
  const callback: IPromiseCallback<T> = (err, ret) => {
    if (err) {
      callback.reject(err);
    } else {
      callback.resolve(ret);
    }
  };
  callback.promise = new Promise((resolve, reject) => {
    callback.resolve = resolve;
    callback.reject = reject;
  });
  return callback;
}

/**
 * 合并对象
 *
 * @param {Object} a
 * @param {Object} b
 * @return {Object}
 */
export function merge(...args: object[]) {
  const ret = {};
  for (const obj of args) {
    Object.assign(ret, obj);
  }
  return ret;
}

/**
 * 获取路径
 *
 * @param {string} def 定义的key
 * @param {(string | boolean)} [opt] 配置项
 * @returns {string} 结果路径
 */
export function getPath(def: string, opt?: string | boolean): string {
  return typeof opt === "string" ? opt : def;
}

/**
 * 驼峰线转下划
 *
 * @param {String} str 输入字符串
 */
export function camelCase2underscore(str: string): string {
  return str
    .replace(/^\S/, (s) => s.toLowerCase())
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase();
}

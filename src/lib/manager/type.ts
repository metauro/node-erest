"use strict";

/**
 * @file API 类型管理器
 * 参考 hojs
 * @author Yourtion Guo <yourtion@gmail.com>
 */

import * as assert from "assert";
import { core as debug } from "../debug";
import { Manager } from "./manager";

export interface IType {
  checker: () => boolean;
  formatter?: () => any;
  parser?: () => any;
  paramsChecker?: () => boolean;
  description: string;
  isDefault: boolean;
  isParamsRequire: boolean;
}

export class TypeManager extends Manager {

  /**
   * 注册参数类型
   *
   * 参数检查工作流程：
   *
   * ```
   * data = parser(data);
   * if (!checker(data, checkerParams)) throw new Error('检查参数失败');
   * data = formatter(data);
   * ```
   *
   * @param {String} name
   * @param {IType} options
   *   - {Function} checker 参数检查器，函数格式：`function (v, params) { return true; }`
   *   - {Function} formatter 参数格式化，函数格式：`function (v) { return v; }`
   *   - {Function} parser 参数解析，函数格式：`function (v) { return v; }`
   *   - {Function} paramsChecker 参数检查器的参数检查，函数格式：`function (params) { return true; }`
   *   - {String} description 参数描述（用于文档生成）
   *   - {Boolean} isDefault 是否为默认参数
   *   - {Boolean} isParamsRequire 是否强制需要paramsChecker
   * @return {Object}
   */
  public register(name: string, options: IType) {

    let { isDefault, isParamsRequire } = options;
    const { formatter, parser, paramsChecker, checker, description = "" } = options;
    isDefault = !!isDefault;
    isParamsRequire = !!isParamsRequire;

    assert(name && typeof name === "string", "参数名称必须是字符串类型");
    assert(/^[A-Z]/.test(name[0]), `参数名称必须以大写字母开头：${ name }`);
    assert(!this.get(name), `该参数已被注册：${ name }`);

    assert(typeof description === "string", "参数描述必须是字符串类型");

    assert(checker && typeof checker === "function", "checker必须是函数类型");

    if (formatter !== undefined) {
      assert(typeof formatter === "function", "formatter必须是函数类型");
    }

    if (parser !== undefined) {
      assert(typeof parser === "function", "parser必须是函数类型");
    }

    if (paramsChecker !== undefined) {
      assert(typeof paramsChecker === "function", "paramsChecker必须是函数类型");
    }

    this.map.set(name, { name, checker, formatter, parser, paramsChecker, description, isDefault, isParamsRequire });

    if (!isDefault) {
      debug("register type: name=%s, checker=%s, formatter=%s, paramsChecker=%s description=%s",
        name, checker, formatter, paramsChecker, description);
    }

    return this;
  }

}

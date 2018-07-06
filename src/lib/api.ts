/**
 * @file API Scheme
 * @author Yourtion Guo <yourtion@gmail.com>
 */

import assert from "assert";
import joi from "joi";
import pathToRegExp from "path-to-regexp";
import { api as debug } from "./debug";
import { getSchemaKey, SourceResult } from "./utils";

export interface IExample {
  input: Record<string, any>;
  output: Record<string, any>;
}

export type DEFAULT_HANDLER = (...args: any[]) => any;
export type SUPPORT_METHODS = "get" | "post" | "put" | "delete" | "patch";

export const SUPPORT_METHOD = ["get", "post", "put", "delete", "patch"];

export interface APICommon<T = DEFAULT_HANDLER> {
  method: SUPPORT_METHODS;
  path: string;
  title: string;
  description?: string;
  handler?: T;
  response?: joi.SchemaMap;
}

export interface APIDefine<T> extends APICommon<T> {
  query?: joi.SchemaMap;
  body?: joi.SchemaMap;
  params?: joi.SchemaMap;
  before?: Array<T>;
  middlewares?: Array<T>;
  handler: T;
}

export interface APIOption<T> extends Record<string, any> {
  group: string;
  realPath: string;
  examples: IExample[];
  beforeHooks: Set<T>;
  middlewares: Set<T>;
  _params: Map<string, joi.SchemaLike>;
  tested: boolean;
}

export default class API<T = DEFAULT_HANDLER> {
  public key: string;
  public pathTestRegExp: RegExp;
  public inited: boolean;
  public options: APIOption<T>;

  /**
   * 构造函数
   */
  constructor(method: SUPPORT_METHODS, path: any, sourceFile: SourceResult, group?: string) {
    assert(method && typeof method === "string", "`method`必须是字符串类型");
    assert(
      SUPPORT_METHOD.indexOf(method.toLowerCase()) !== -1,
      "`method`必须是以下请求方法中的一个：" + SUPPORT_METHOD,
    );
    assert(path && typeof path === "string", "`path`必须是字符串类型");
    assert(path[0] === "/", '`path`必须以"/"开头');

    this.key = getSchemaKey(method, path, group);

    this.options = {
      sourceFile,
      method: method.toLowerCase() as SUPPORT_METHODS,
      path,
      realPath: this.key.split("_")[1],
      examples: [],
      beforeHooks: new Set(),
      middlewares: new Set(),
      query: {} as joi.SchemaMap,
      body: {} as joi.SchemaMap,
      params: {} as joi.SchemaMap,
      _params: new Map() as Map<string, joi.SchemaLike>,
      group: group || "",
      tested: false,
    };

    this.pathTestRegExp = pathToRegExp(this.options.realPath);
    this.inited = false;

    debug("new: %s %s from %s", method, path, sourceFile);
  }

  public static define<T>(options: APIDefine<T>, sourceFile: SourceResult, group?: string) {
    const schema = new API<T>(options.method, options.path, sourceFile, group);
    schema.title(options.title);
    if (group) {
      schema.group(group);
    }
    if (options.description) {
      schema.description(options.description);
    }
    if (options.response) {
      schema.response(options.response);
    }
    if (options.body) {
      schema.body(options.body);
    }
    if (options.query) {
      schema.query(options.query);
    }
    if (options.params) {
      schema.params(options.params);
    }
    if (options.middlewares && options.middlewares.length > 0) {
      schema.middlewares(...options.middlewares);
    }
    if (options.before && options.before.length > 0) {
      schema.before(...options.before);
    }
    schema.register(options.handler);
    return schema;
  }

  /**
   * 检查是否已经完成初始化，如果是则报错
   */
  private checkInited() {
    if (this.inited) {
      throw new Error(`${this.key}已经完成初始化，不能再进行更改`);
    }
  }

  /**
   * 检查URL是否符合API规则
   */
  public pathTest(method: SUPPORT_METHODS, path: string) {
    return this.options.method === method.toLowerCase() && this.pathTestRegExp.test(path);
  }

  /**
   * API标题
   */
  public title(title: string) {
    this.checkInited();
    assert(typeof title === "string", "`title`必须是字符串类型");
    this.options.title = title;
    return this;
  }

  /**
   * API描述
   */
  public description(description: string) {
    this.checkInited();
    assert(typeof description === "string", "`description`必须是字符串类型");
    this.options.description = description;
    return this;
  }

  /**
   * API分组
   */
  public group(group: string) {
    this.checkInited();
    assert(typeof group === "string", "`group`必须是字符串类型");
    this.options.group = group;
    return this;
  }

  private addExample(example: IExample) {
    this.options.examples.push(example);
  }

  /**
   * API使用例子
   */
  public example(example: IExample) {
    this.checkInited();
    assert(example.input && typeof example.input === "object", "`input`必须是一个对象");
    assert(example.output && typeof example.output === "object", "`output`必须是一个对象");
    this.addExample(example);
    return this;
  }

  /**
   * 输出结果对象
   */
  public response(response: joi.SchemaMap) {
    assert(typeof response === "object", "`schema`必须是一个对象");
    this.options.response = response;
    return this;
  }

  /**
   * 输入参数
   */
  private setParams(name: string, options: joi.SchemaLike, place: string) {
    this.checkInited();

    assert(name && typeof name === "string", "`name`必须是字符串类型");
    assert(place && ["query", "body", "params"].indexOf(place) > -1, '`place` 必须是 "query" "body", "param"');
    assert(name.indexOf(" ") === -1, "`name`不能包含空格");
    assert(name[0] !== "$", '`name`不能以"$"开头');
    assert(!(name in this.options._params), `参数 ${name} 已存在`);

    assert(options && (typeof options === "string" || typeof options === "object"));

    this.options._params.set(name, options);
    this.options[place][name] = options;
  }

  /**
   * Body 参数
   */
  public body(obj: Record<string, joi.SchemaLike>) {
    for (const key of Object.keys(obj)) {
      const o = obj[key];
      this.setParams(key, o, "body");
    }
    return this;
  }

  /**
   * Query 参数
   */
  public query(obj: Record<string, joi.SchemaLike>) {
    for (const key of Object.keys(obj)) {
      const o = obj[key];
      this.setParams(key, o, "query");
    }
    return this;
  }

  /**
   * Param 参数
   */
  public params(obj: Record<string, joi.SchemaLike>) {
    for (const key of Object.keys(obj)) {
      const o = obj[key];
      this.setParams(key, o, "params");
    }
    return this;
  }

  /**
   * 中间件
   */
  public middlewares(...list: Array<T>) {
    this.checkInited();
    for (const mid of list) {
      assert(typeof mid === "function", "中间件必须是Function类型");
      this.options.middlewares.add(mid);
    }
    return this;
  }

  /**
   * 注册执行之前的钩子
   */
  public before(...list: Array<T>) {
    this.checkInited();
    for (const hook of list) {
      assert(typeof hook === "function", "钩子名称必须是Function类型");
      this.options.beforeHooks.add(hook);
    }
    return this;
  }

  /**
   * 注册处理函数
   */
  public register(fn: T) {
    this.checkInited();
    assert(typeof fn === "function", "处理函数必须是一个函数类型");
    this.options.handler = fn;
    return this;
  }

  public init(parent: any) {
    this.checkInited();

    assert(this.options.group, `请为 API ${this.key} 选择一个分组`);
    assert(
      this.options.group && this.options.group in parent.privateInfo.groups,
      `请先配置 ${this.options.group} 分组`,
    );

    // TODO: 初始化时参数类型检查

    this.inited = true;
  }
}
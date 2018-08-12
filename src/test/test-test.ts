import { createReadStream, writeFileSync } from "fs";
import { resolve } from "path";

import { apiAll, apiJson, build, TYPES } from "./helper";
import lib from "./lib";

import express from "express";

const app = express();
const router = express.Router();
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

const apiService = lib();
const api = apiService.api;
apiAll(api);
apiJson(api);
apiJson(api, "/json3");
const jsonApi = apiJson(api, "/json2");
jsonApi.description("测试JSON用");
const JsonSchema = {
  num: build(TYPES.Number, "Number", false, 10, { max: 10, min: 0 }),
  type: build(TYPES.ENUM, "类型", false, undefined, ["a", "b"]),
  int_arr: build(TYPES.IntArray, "数组"),
  date: build(TYPES.Date, "日期"),
};
jsonApi.response(JsonSchema);
jsonApi.query(JsonSchema);
jsonApi.requiredOneOf(["age", "type"]);
apiService.bindRouter(router, apiService.checkerExpress);

apiService.initTest(app, __dirname, "/tmp");
function format(data: any): [Error | null, any] {
  if (typeof data === "object") {
    if (data.success) {
      return [null, data.result || "success"];
    }
    return [data.msg || "error", null];
  }
  return [null, data];
}

apiService.setFormatOutput(format);

function writter(path:string, data:any) {
  return writeFileSync(path, data);
}
apiService.setDocWritter(writter);

const share = {
  name: "Yourtion",
  age: 22,
  ageStr: "abc",
};
router.use((err: any, req: any, res: any, next: any) => {
  if (err) {
    return res.end(err.message);
  }
  next();
});
app.use("/api", router);
apiService.initTest(app);

for (const agent of [apiService.test.session(), apiService.test]) {
  const info = agent === apiService.test ? "No session" : "Session";

  describe("TEST - " + info, () => {
    it("TEST - Get success", async () => {
      const { text: ret } = await agent
        .get("/api/index")
        .input({
          name: share.name,
        })
        .takeExample("Index-Get")
        .raw();
      expect(ret).toBe(`Get ${share.name}`);
    });

    it("TEST - Post success", async () => {
      const { text: ret } = await agent
        .post("/api/index")
        .query({
          name: share.name,
        })
        .input({
          age: share.age,
        })
        .takeExample("Index-Post")
        .raw();
      expect(ret).toBe(`Post ${share.name}:${share.age}`);
    });

    it("TEST - Put success", async () => {
      const { text: ret } = await agent
        .put("/api/index")
        .input({
          age: share.age,
        })
        .takeExample("Index-Put")
        .raw();
      expect(ret).toBe(`Put ${share.age}`);
    });

    it("TEST - Delete success", async () => {
      const { text: ret } = await agent
        .delete("/api/index/" + share.name)
        .takeExample("Index-Delete")
        .raw();
      expect(ret).toBe(`Delete ${share.name}`);
    });

    it("TEST - Patch success", async () => {
      const { text: ret } = await agent
        .patch("/api/index")
        .takeExample("Index-Patch")
        .raw();
      expect(ret).toBe(`Patch`);
    });

    it("TEST - Post missing params", async () => {
      const { text: ret } = await agent
        .post("/api/index")
        .query({
          name: "a",
        })
        .attach({
          field: 666,
          file: createReadStream(resolve(__dirname, "./lib.ts")),
        })
        .takeExample("Index-Post")
        .raw();
      expect(ret).toBe("missing required parameter 'age' is required!");
    });

    it("TEST - Post missing params", async () => {
      const { text: ret } = await agent
        .put("/api/index")
        .input({
          age: share.ageStr,
        })
        .takeExample("Index-Post")
        .raw();
      expect(ret).toBe("incorrect parameter 'age' should be valid Integer");
    });

    it("TEST - JSON FormatOutput error", async () => {
      const ret = await agent
        .get("/api/json")
        .input({
          age: 10,
        })
        .takeExample("Index-JSON")
        .error();
      expect(ret).toBe("error");
    });

    it("TEST - JSON FormatOutput success", async () => {
      const ret = await agent
        .get("/api/json")
        .input({
          age: share.age,
        })
        .takeExample("Index-JSON")
        .success();
      expect(ret).toEqual({ age: share.age });
    });

    it("TEST - Header success", async () => {
      const { body } = await agent
        .get("/api/json")
        .headers({
          test: true,
        })
        .input({
          age: share.age,
        })
        .takeExample("Index-Header")
        .raw();
      expect(body.result).toEqual({ age: share.age });
      expect(body.headers.test).toEqual("true");
    });

    it("TEST - API requiredOneOf error", async () => {
      const ret = await agent
        .get("/api/json2")
        .takeExample("Index-JSON")
        .error();
      expect(ret).toBe("error");
    });

    it("TEST - API default value", async () => {
      const ret = await agent
        .get("/api/json2")
        .input({
          age: share.age,
          $a: "a",
        })
        .takeExample("Index-JSON")
        .success();
      expect(ret).toEqual({ age: 22, num: 10 });
    });

    it("success when error", async () => {
      try {
        const ret = await agent.get("/api/json2").success();
        expect(ret).toBeUndefined();
      } catch (err) {
        expect(err.message).toContain("期望API输出成功结果，但实际输出失败结果");
      }
    });

    it("error when success", async () => {
      try {
        const ret = await agent
          .get("/api/json")
          .input({ age: share.age })
          .error();
        expect(ret).toBeUndefined();
      } catch (err) {
        expect(err.message).toContain("期望API输出失败结果，但实际输出成功结果");
      }
    });

    it("unregister api session", async () => {
      try {
        const ret = await agent.get("/api/qqq").error();
        expect(ret).toBeUndefined();
      } catch (err) {
        expect(err.message).toContain("尝试请求未注册的API");
      }
    });

    it("unregister api seeion", async () => {
      try {
        const ret = await apiService.test.get("/api/qqq").error();
        expect(ret).toBeUndefined();
      } catch (err) {
        expect(err.message).toContain("尝试请求未注册的API");
      }
    });

    it("TEST - Gen docs", () => {
      apiService.genDocs("/tmp/", false);
    });
  });
}

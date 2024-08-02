var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// index.ts
import cors from "cors";
import "dotenv/config";
import express2 from "express";

// src/observability/index.ts
var initObservability = () => {
};

// src/routes/chat.route.ts
import express from "express";

// src/controllers/chat-config.controller.ts
var chatConfig = (_req, res) => __async(void 0, null, function* () {
  let starterQuestions = void 0;
  if (process.env.CONVERSATION_STARTERS && process.env.CONVERSATION_STARTERS.trim()) {
    starterQuestions = process.env.CONVERSATION_STARTERS.trim().split("\n");
  }
  return res.status(200).json({
    starterQuestions
  });
});

// src/controllers/engine/chat.ts
import {
  OpenAIAgent,
  QueryEngineTool
} from "llamaindex";
import fs3 from "fs/promises";
import path3 from "path";

// src/controllers/engine/index.ts
import { VectorStoreIndex } from "llamaindex";
import { storageContextFromDefaults } from "llamaindex/storage/StorageContext";

// src/controllers/engine/shared.ts
var STORAGE_CACHE_DIR = "./cache";

// src/controllers/engine/index.ts
function getDataSource() {
  return __async(this, null, function* () {
    const storageContext = yield storageContextFromDefaults({
      persistDir: `${STORAGE_CACHE_DIR}`
    });
    const numberOfDocs = Object.keys(
      storageContext.docStore.toDict()
    ).length;
    if (numberOfDocs === 0) {
      return null;
    }
    return yield VectorStoreIndex.init({
      storageContext
    });
  });
}

// src/controllers/engine/tools/index.ts
import { ToolsFactory } from "llamaindex/tools/ToolsFactory";

// src/controllers/engine/tools/duckduckgo.ts
import { search } from "duck-duck-scrape";
var DEFAULT_META_DATA = {
  name: "duckduckgo",
  description: "Use this function to search for any query in DuckDuckGo.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The query to search in DuckDuckGo."
      },
      region: {
        type: "string",
        description: "Optional, The region to be used for the search in [country-language] convention, ex us-en, uk-en, ru-ru, etc...",
        nullable: true
      }
    },
    required: ["query"]
  }
};
var DuckDuckGoSearchTool = class {
  constructor(params) {
    var _a;
    this.metadata = (_a = params.metadata) != null ? _a : DEFAULT_META_DATA;
  }
  call(input) {
    return __async(this, null, function* () {
      const { query, region } = input;
      const options = region ? { region } : {};
      const searchResults = yield search(query, options);
      return searchResults.results.map((result) => {
        return {
          title: result.title,
          description: result.description,
          url: result.url
        };
      });
    });
  }
};

// src/controllers/engine/tools/img-gen.ts
import { FormData } from "formdata-node";
import fs from "fs";
import got from "got";
import path from "path";
var DEFAULT_META_DATA2 = {
  name: "image_generator",
  description: `Use this function to generate an image based on the prompt.`,
  parameters: {
    type: "object",
    properties: {
      prompt: {
        type: "string",
        description: "The prompt to generate the image"
      }
    },
    required: ["prompt"]
  }
};
var ImgGeneratorTool = class {
  constructor(params) {
    this.IMG_OUTPUT_FORMAT = "webp";
    this.IMG_OUTPUT_DIR = "output/tool";
    this.IMG_GEN_API = "https://api.stability.ai/v2beta/stable-image/generate/core";
    this.generateImage = (prompt) => __async(this, null, function* () {
      try {
        const buffer = yield this.promptToImgBuffer(prompt);
        const imageUrl = this.saveImage(buffer);
        return { isSuccess: true, imageUrl };
      } catch (error) {
        console.error(error);
        return {
          isSuccess: false,
          errorMessage: "Failed to generate image. Please try again."
        };
      }
    });
    this.promptToImgBuffer = (prompt) => __async(this, null, function* () {
      const form = new FormData();
      form.append("prompt", prompt);
      form.append("output_format", this.IMG_OUTPUT_FORMAT);
      const buffer = yield got.post(this.IMG_GEN_API, {
        // Not sure why it shows an type error when passing form to body
        // Although I follow document: https://github.com/sindresorhus/got/blob/main/documentation/2-options.md#body
        // Tt still works fine, so I make casting to unknown to avoid the typescript warning
        // Found a similar issue: https://github.com/sindresorhus/got/discussions/1877
        body: form,
        headers: {
          Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
          Accept: "image/*"
        }
      }).buffer();
      return buffer;
    });
    this.saveImage = (buffer) => {
      const filename = `${crypto.randomUUID()}.${this.IMG_OUTPUT_FORMAT}`;
      const outputPath = path.join(this.IMG_OUTPUT_DIR, filename);
      fs.writeFileSync(outputPath, buffer);
      const url = `${process.env.FILESERVER_URL_PREFIX}/${this.IMG_OUTPUT_DIR}/${filename}`;
      console.log(`Saved image to ${outputPath}.
URL: ${url}`);
      return url;
    };
    this.checkRequiredEnvVars = () => {
      if (!process.env.STABILITY_API_KEY) {
        throw new Error(
          "STABILITY_API_KEY key is required to run image generator. Get it here: https://platform.stability.ai/account/keys"
        );
      }
      if (!process.env.FILESERVER_URL_PREFIX) {
        throw new Error(
          "FILESERVER_URL_PREFIX is required to display file output after generation"
        );
      }
    };
    this.checkRequiredEnvVars();
    this.metadata = (params == null ? void 0 : params.metadata) || DEFAULT_META_DATA2;
  }
  call(input) {
    return __async(this, null, function* () {
      return yield this.generateImage(input.prompt);
    });
  }
};

// src/controllers/engine/tools/interpreter.ts
import { CodeInterpreter } from "@e2b/code-interpreter";
import fs2 from "fs";
import crypto2 from "crypto";
import path2 from "path";
var DEFAULT_META_DATA3 = {
  name: "interpreter",
  description: "Execute python code in a Jupyter notebook cell and return any result, stdout, stderr, display_data, and error.",
  parameters: {
    type: "object",
    properties: {
      code: {
        type: "string",
        description: "The python code to execute in a single cell."
      }
    },
    required: ["code"]
  }
};
var InterpreterTool = class {
  constructor(params) {
    this.outputDir = "output/tool";
    this.metadata = (params == null ? void 0 : params.metadata) || DEFAULT_META_DATA3;
    this.apiKey = (params == null ? void 0 : params.apiKey) || process.env.E2B_API_KEY;
    this.fileServerURLPrefix = (params == null ? void 0 : params.fileServerURLPrefix) || process.env.FILESERVER_URL_PREFIX;
    if (!this.apiKey) {
      throw new Error(
        "E2B_API_KEY key is required to run code interpreter. Get it here: https://e2b.dev/docs/getting-started/api-key"
      );
    }
    if (!this.fileServerURLPrefix) {
      throw new Error(
        "FILESERVER_URL_PREFIX is required to display file output from sandbox"
      );
    }
  }
  initInterpreter() {
    return __async(this, null, function* () {
      if (!this.codeInterpreter) {
        this.codeInterpreter = yield CodeInterpreter.create({
          apiKey: this.apiKey
        });
      }
      return this.codeInterpreter;
    });
  }
  codeInterpret(code) {
    return __async(this, null, function* () {
      console.log(
        `
${"=".repeat(50)}
> Running following AI-generated code:
${code}
${"=".repeat(50)}`
      );
      const interpreter = yield this.initInterpreter();
      const exec = yield interpreter.notebook.execCell(code);
      if (exec.error) console.error("[Code Interpreter error]", exec.error);
      const extraResult = yield this.getExtraResult(exec.results[0]);
      const result = {
        isError: !!exec.error,
        logs: exec.logs,
        extraResult
      };
      return result;
    });
  }
  call(input) {
    return __async(this, null, function* () {
      const result = yield this.codeInterpret(input.code);
      return result;
    });
  }
  close() {
    return __async(this, null, function* () {
      var _a;
      yield (_a = this.codeInterpreter) == null ? void 0 : _a.close();
    });
  }
  getExtraResult(res) {
    return __async(this, null, function* () {
      if (!res) return [];
      const output = [];
      try {
        const formats = res.formats();
        const results = formats.map((f) => res[f]);
        for (let i = 0; i < formats.length; i++) {
          const ext = formats[i];
          const data = results[i];
          switch (ext) {
            case "png":
            case "jpeg":
            case "svg":
            case "pdf":
              const { filename } = this.saveToDisk(data, ext);
              output.push({
                type: ext,
                filename,
                url: this.getFileUrl(filename)
              });
              break;
            default:
              output.push({
                type: ext,
                content: data
              });
              break;
          }
        }
      } catch (error) {
        console.error("Error when parsing e2b response", error);
      }
      return output;
    });
  }
  // Consider saving to cloud storage instead but it may cost more for you
  // See: https://e2b.dev/docs/sandbox/api/filesystem#write-to-file
  saveToDisk(base64Data, ext) {
    const filename = `${crypto2.randomUUID()}.${ext}`;
    const buffer = Buffer.from(base64Data, "base64");
    const outputPath = this.getOutputPath(filename);
    fs2.writeFileSync(outputPath, buffer);
    console.log(`Saved file to ${outputPath}`);
    return {
      outputPath,
      filename
    };
  }
  getOutputPath(filename) {
    if (!fs2.existsSync(this.outputDir)) {
      fs2.mkdirSync(this.outputDir, { recursive: true });
    }
    return path2.join(this.outputDir, filename);
  }
  getFileUrl(filename) {
    return `${this.fileServerURLPrefix}/${this.outputDir}/${filename}`;
  }
};

// src/controllers/engine/tools/openapi-action.ts
import SwaggerParser from "@apidevtools/swagger-parser";
import got2 from "got";
import { FunctionTool } from "llamaindex";
var _OpenAPIActionTool = class _OpenAPIActionTool {
  constructor(openapi_uri, domainHeaders = {}) {
    this.openapi_uri = openapi_uri;
    this.domainHeaders = domainHeaders;
    this.INVALID_URL_PROMPT = "This url did not include a hostname or scheme. Please determine the complete URL and try again.";
    this.createLoadSpecMetaData = (info) => {
      return {
        name: "load_openapi_spec",
        description: `Use this to retrieve the OpenAPI spec for the API named ${info.title} with the following description: ${info.description}. Call it before making any requests to the API.`
      };
    };
    this.createMethodCallMetaData = (method, info) => {
      return {
        name: `${method.toLowerCase()}_request`,
        description: `Use this to call the ${method} method on the API named ${info.title}`,
        parameters: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: `The url to make the ${method} request against`
            },
            params: {
              type: "object",
              description: method === "GET" ? "the URL parameters to provide with the get request" : `the key-value pairs to provide with the ${method} request`
            }
          },
          required: ["url"]
        }
      };
    };
  }
  loadOpenapiSpec(url) {
    return __async(this, null, function* () {
      const api = yield SwaggerParser.validate(url);
      return {
        servers: "servers" in api ? api.servers : "",
        info: { description: api.info.description, title: api.info.title },
        endpoints: api.paths
      };
    });
  }
  getRequest(input) {
    return __async(this, null, function* () {
      if (!this.validUrl(input.url)) {
        return this.INVALID_URL_PROMPT;
      }
      try {
        const data = yield got2.get(input.url, {
          headers: this.getHeadersForUrl(input.url),
          searchParams: input.params
        }).json();
        return data;
      } catch (error) {
        return error;
      }
    });
  }
  postRequest(input) {
    return __async(this, null, function* () {
      if (!this.validUrl(input.url)) {
        return this.INVALID_URL_PROMPT;
      }
      try {
        const res = yield got2.post(input.url, {
          headers: this.getHeadersForUrl(input.url),
          json: input.params
        });
        return res.body;
      } catch (error) {
        return error;
      }
    });
  }
  patchRequest(input) {
    return __async(this, null, function* () {
      if (!this.validUrl(input.url)) {
        return this.INVALID_URL_PROMPT;
      }
      try {
        const res = yield got2.patch(input.url, {
          headers: this.getHeadersForUrl(input.url),
          json: input.params
        });
        return res.body;
      } catch (error) {
        return error;
      }
    });
  }
  toToolFunctions() {
    return __async(this, null, function* () {
      if (!_OpenAPIActionTool.specs[this.openapi_uri]) {
        console.log(`Loading spec for URL: ${this.openapi_uri}`);
        const spec2 = yield this.loadOpenapiSpec(this.openapi_uri);
        _OpenAPIActionTool.specs[this.openapi_uri] = spec2;
      }
      const spec = _OpenAPIActionTool.specs[this.openapi_uri];
      return [
        FunctionTool.from(() => {
          return spec;
        }, this.createLoadSpecMetaData(spec.info)),
        FunctionTool.from(
          this.getRequest.bind(this),
          this.createMethodCallMetaData("GET", spec.info)
        ),
        FunctionTool.from(
          this.postRequest.bind(this),
          this.createMethodCallMetaData("POST", spec.info)
        ),
        FunctionTool.from(
          this.patchRequest.bind(this),
          this.createMethodCallMetaData("PATCH", spec.info)
        )
      ];
    });
  }
  validUrl(url) {
    const parsed = new URL(url);
    return !!parsed.protocol && !!parsed.hostname;
  }
  getDomain(url) {
    const parsed = new URL(url);
    return parsed.hostname;
  }
  getHeadersForUrl(url) {
    const domain = this.getDomain(url);
    return this.domainHeaders[domain] || {};
  }
};
// cache the loaded specs by URL
_OpenAPIActionTool.specs = {};
var OpenAPIActionTool = _OpenAPIActionTool;

// src/controllers/engine/tools/weather.ts
var DEFAULT_META_DATA4 = {
  name: "get_weather_information",
  description: `
    Use this function to get the weather of any given location.
    Note that the weather code should follow WMO Weather interpretation codes (WW):
    0: Clear sky
    1, 2, 3: Mainly clear, partly cloudy, and overcast
    45, 48: Fog and depositing rime fog
    51, 53, 55: Drizzle: Light, moderate, and dense intensity
    56, 57: Freezing Drizzle: Light and dense intensity
    61, 63, 65: Rain: Slight, moderate and heavy intensity
    66, 67: Freezing Rain: Light and heavy intensity
    71, 73, 75: Snow fall: Slight, moderate, and heavy intensity
    77: Snow grains
    80, 81, 82: Rain showers: Slight, moderate, and violent
    85, 86: Snow showers slight and heavy
    95: Thunderstorm: Slight or moderate
    96, 99: Thunderstorm with slight and heavy hail
  `,
  parameters: {
    type: "object",
    properties: {
      location: {
        type: "string",
        description: "The location to get the weather information"
      }
    },
    required: ["location"]
  }
};
var WeatherTool = class {
  constructor(params) {
    this.getGeoLocation = (location) => __async(this, null, function* () {
      const apiUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${location}&count=10&language=en&format=json`;
      const response = yield fetch(apiUrl);
      const data = yield response.json();
      const { id, name, latitude, longitude } = data.results[0];
      return { id, name, latitude, longitude };
    });
    this.getWeatherByLocation = (location) => __async(this, null, function* () {
      console.log(
        "Calling open-meteo api to get weather information of location:",
        location
      );
      const { latitude, longitude } = yield this.getGeoLocation(location);
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&hourly=temperature_2m,weather_code&daily=weather_code&timezone=${timezone}`;
      const response = yield fetch(apiUrl);
      const data = yield response.json();
      return data;
    });
    this.metadata = (params == null ? void 0 : params.metadata) || DEFAULT_META_DATA4;
  }
  call(input) {
    return __async(this, null, function* () {
      return yield this.getWeatherByLocation(input.location);
    });
  }
};

// src/controllers/engine/tools/index.ts
function createTools(toolConfig) {
  return __async(this, null, function* () {
    const tools = yield createLocalTools(toolConfig.local);
    tools.push(...yield ToolsFactory.createTools(toolConfig.llamahub));
    return tools;
  });
}
var toolFactory = {
  weather: (config) => __async(void 0, null, function* () {
    return [new WeatherTool(config)];
  }),
  interpreter: (config) => __async(void 0, null, function* () {
    return [new InterpreterTool(config)];
  }),
  "openapi_action.OpenAPIActionToolSpec": (config) => __async(void 0, null, function* () {
    const { openapi_uri, domain_headers } = config;
    const openAPIActionTool = new OpenAPIActionTool(
      openapi_uri,
      domain_headers
    );
    return yield openAPIActionTool.toToolFunctions();
  }),
  duckduckgo: (config) => __async(void 0, null, function* () {
    return [new DuckDuckGoSearchTool(config)];
  }),
  img_gen: (config) => __async(void 0, null, function* () {
    return [new ImgGeneratorTool(config)];
  })
};
function createLocalTools(localConfig) {
  return __async(this, null, function* () {
    const tools = [];
    for (const [key, toolConfig] of Object.entries(localConfig)) {
      if (key in toolFactory) {
        const newTools = yield toolFactory[key](toolConfig);
        tools.push(...newTools);
      }
    }
    return tools;
  });
}

// src/controllers/engine/chat.ts
function createChatEngine(documentIds) {
  return __async(this, null, function* () {
    const tools = [];
    const index = yield getDataSource();
    if (index) {
      tools.push(
        new QueryEngineTool({
          queryEngine: index.asQueryEngine({
            preFilters: generateFilters(documentIds || [])
          }),
          metadata: {
            name: "data_query_engine",
            description: `A query engine for documents from your data source.`
          }
        })
      );
    }
    const configFile = path3.join("config", "tools.json");
    let toolConfig;
    try {
      toolConfig = JSON.parse(yield fs3.readFile(configFile, "utf8"));
    } catch (e) {
      console.info(`Could not read ${configFile} file. Using no tools.`);
    }
    if (toolConfig) {
      tools.push(...yield createTools(toolConfig));
    }
    return new OpenAIAgent({
      tools,
      systemPrompt: process.env.SYSTEM_PROMPT
    });
  });
}
function generateFilters(documentIds) {
  const publicDocumentsFilter = {
    key: "private",
    value: ["true"],
    operator: "nin"
  };
  if (!documentIds.length) return { filters: [publicDocumentsFilter] };
  const privateDocumentsFilter = {
    key: "doc_id",
    value: documentIds,
    operator: "in"
  };
  return {
    filters: [publicDocumentsFilter, privateDocumentsFilter],
    condition: "or"
  };
}

// src/controllers/chat-request.controller.ts
var convertMessageContent = (textMessage, imageUrl) => {
  if (!imageUrl) return textMessage;
  return [
    {
      type: "text",
      text: textMessage
    },
    {
      type: "image_url",
      image_url: {
        url: imageUrl
      }
    }
  ];
};
var chatRequest = (req, res) => __async(void 0, null, function* () {
  try {
    const { messages, data } = req.body;
    const userMessage = messages.pop();
    if (!messages || !userMessage || userMessage.role !== "user") {
      return res.status(400).json({
        error: "messages are required in the request body and the last message must be from the user"
      });
    }
    const userMessageContent = convertMessageContent(
      userMessage.content,
      data == null ? void 0 : data.imageUrl
    );
    const chatEngine = yield createChatEngine();
    const response = yield chatEngine.chat({
      message: userMessageContent,
      chatHistory: messages
    });
    const result = {
      role: "assistant",
      content: response.response
    };
    return res.status(200).json({
      result
    });
  } catch (error) {
    console.error("[LlamaIndex]", error);
    return res.status(500).json({
      detail: error.message
    });
  }
});

// src/controllers/llamaindex/documents/helper.ts
import fs4 from "fs";
import crypto3 from "crypto";

// src/controllers/engine/loader.ts
import {
  FILE_EXT_TO_READER,
  SimpleDirectoryReader
} from "llamaindex/readers/SimpleDirectoryReader";
function getExtractors() {
  return FILE_EXT_TO_READER;
}

// src/controllers/llamaindex/documents/helper.ts
var MIME_TYPE_TO_EXT = {
  "application/pdf": "pdf",
  "text/plain": "txt",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx"
};
var UPLOADED_FOLDER = "output/uploaded";
function loadDocuments(fileBuffer, mimeType) {
  return __async(this, null, function* () {
    const extractors = getExtractors();
    const reader = extractors[MIME_TYPE_TO_EXT[mimeType]];
    if (!reader) {
      throw new Error(`Unsupported document type: ${mimeType}`);
    }
    console.log(`Processing uploaded document of type: ${mimeType}`);
    return yield reader.loadDataAsContent(fileBuffer);
  });
}
function saveDocument(fileBuffer, mimeType) {
  return __async(this, null, function* () {
    const fileExt = MIME_TYPE_TO_EXT[mimeType];
    if (!fileExt) throw new Error(`Unsupported document type: ${mimeType}`);
    const filename = `${crypto3.randomUUID()}.${fileExt}`;
    const filepath = `${UPLOADED_FOLDER}/${filename}`;
    const fileurl = `${process.env.FILESERVER_URL_PREFIX}/${filepath}`;
    if (!fs4.existsSync(UPLOADED_FOLDER)) {
      fs4.mkdirSync(UPLOADED_FOLDER, { recursive: true });
    }
    yield fs4.promises.writeFile(filepath, fileBuffer);
    console.log(`Saved document file to ${filepath}.
URL: ${fileurl}`);
    return {
      filename,
      filepath,
      fileurl
    };
  });
}

// src/controllers/llamaindex/documents/pipeline.ts
import {
  IngestionPipeline,
  Settings,
  SimpleNodeParser
} from "llamaindex";
import { LlamaCloudIndex } from "llamaindex/cloud/LlamaCloudIndex";
function runPipeline(currentIndex, documents) {
  return __async(this, null, function* () {
    if (currentIndex instanceof LlamaCloudIndex) {
      for (const document of documents) {
        yield currentIndex.insert(document);
      }
    } else {
      const pipeline = new IngestionPipeline({
        transformations: [
          new SimpleNodeParser({
            chunkSize: Settings.chunkSize,
            chunkOverlap: Settings.chunkOverlap
          }),
          Settings.embedModel
        ]
      });
      const nodes = yield pipeline.run({ documents });
      yield currentIndex.insertNodes(nodes);
      currentIndex.storageContext.docStore.persist();
      console.log("Added nodes to the vector store.");
    }
    return documents.map((document) => document.id_);
  });
}

// src/controllers/llamaindex/documents/upload.ts
function uploadDocument(index, raw) {
  return __async(this, null, function* () {
    const [header, content] = raw.split(",");
    const mimeType = header.replace("data:", "").replace(";base64", "");
    const fileBuffer = Buffer.from(content, "base64");
    const documents = yield loadDocuments(fileBuffer, mimeType);
    const { filename } = yield saveDocument(fileBuffer, mimeType);
    for (const document of documents) {
      document.metadata = __spreadProps(__spreadValues({}, document.metadata), {
        file_name: filename,
        private: "true"
        // to separate private uploads from public documents
      });
    }
    return yield runPipeline(index, documents);
  });
}

// src/controllers/chat-upload.controller.ts
var chatUpload = (req, res) => __async(void 0, null, function* () {
  const { base64 } = req.body;
  if (!base64) {
    return res.status(400).json({
      error: "base64 is required in the request body"
    });
  }
  const index = yield getDataSource();
  return res.status(200).json(yield uploadDocument(index, base64));
});

// src/controllers/chat.controller.ts
import { StreamData as StreamData2, streamToResponse } from "ai";
import { Settings as Settings3 } from "llamaindex";

// src/controllers/llamaindex/streaming/annotations.ts
function retrieveDocumentIds(annotations) {
  if (!annotations) return [];
  const ids = [];
  for (const annotation of annotations) {
    const { type, data } = getValidAnnotation(annotation);
    if (type === "document_file" && "files" in data && Array.isArray(data.files)) {
      const files = data.files;
      for (const file of files) {
        if (Array.isArray(file.content.value)) {
          for (const id of file.content.value) {
            ids.push(id);
          }
        }
      }
    }
  }
  return ids;
}
function convertMessageContent2(content, annotations) {
  if (!annotations) return content;
  return [
    {
      type: "text",
      text: content
    },
    ...convertAnnotations(annotations)
  ];
}
function convertAnnotations(annotations) {
  const content = [];
  annotations.forEach((annotation) => {
    const { type, data } = getValidAnnotation(annotation);
    if (type === "image" && "url" in data && typeof data.url === "string") {
      content.push({
        type: "image_url",
        image_url: {
          url: data.url
        }
      });
    }
    if (type === "document_file" && "files" in data && Array.isArray(data.files)) {
      const csvFiles = data.files.filter(
        (file) => file.filetype === "csv"
      );
      if (csvFiles && csvFiles.length > 0) {
        const csvContents = csvFiles.map((file) => {
          const fileContent = Array.isArray(file.content.value) ? file.content.value.join("\n") : file.content.value;
          return "```csv\n" + fileContent + "\n```";
        });
        const text = "Use the following CSV content:\n" + csvContents.join("\n\n");
        content.push({
          type: "text",
          text
        });
      }
    }
  });
  return content;
}
function getValidAnnotation(annotation) {
  if (!(annotation && typeof annotation === "object" && "type" in annotation && typeof annotation.type === "string" && "data" in annotation && annotation.data && typeof annotation.data === "object")) {
    throw new Error("Client sent invalid annotation. Missing data and type");
  }
  return { type: annotation.type, data: annotation.data };
}

// src/controllers/llamaindex/streaming/events.ts
import {
  CallbackManager
} from "llamaindex";

// src/controllers/llamaindex/streaming/service.ts
import fs5 from "fs";
import https from "https";
import path4 from "path";
var LLAMA_CLOUD_OUTPUT_DIR = "output/llamacloud";
var LLAMA_CLOUD_BASE_URL = "https://cloud.llamaindex.ai/api/v1";
var FILE_DELIMITER = "$";
var LLamaCloudFileService = class {
  static downloadFiles(nodes) {
    return __async(this, null, function* () {
      const files = this.nodesToDownloadFiles(nodes);
      if (!files.length) return;
      console.log("Downloading files from LlamaCloud...");
      for (const file of files) {
        yield this.downloadFile(file.pipelineId, file.fileName);
      }
    });
  }
  static toDownloadedName(pipelineId, fileName) {
    return `${pipelineId}${FILE_DELIMITER}${fileName}`;
  }
  /**
   * This function will return an array of unique files to download from LlamaCloud
   * We only download files that are uploaded directly in LlamaCloud datasources (don't have `private` in metadata)
   * Files are uploaded directly in LlamaCloud datasources don't have `private` in metadata (public docs)
   * Files are uploaded from local via `generate` command will have `private=false` (public docs)
   * Files are uploaded from local via `/chat/upload` endpoint will have `private=true` (private docs)
   *
   * @param nodes
   * @returns list of unique files to download
   */
  static nodesToDownloadFiles(nodes) {
    const downloadFiles = [];
    for (const node of nodes) {
      const isLocalFile = node.node.metadata["private"] != null;
      const pipelineId = node.node.metadata["pipeline_id"];
      const fileName = node.node.metadata["file_name"];
      if (isLocalFile || !pipelineId || !fileName) continue;
      const isDuplicate = downloadFiles.some(
        (f) => f.pipelineId === pipelineId && f.fileName === fileName
      );
      if (!isDuplicate) {
        downloadFiles.push({ pipelineId, fileName });
      }
    }
    return downloadFiles;
  }
  static downloadFile(pipelineId, fileName) {
    return __async(this, null, function* () {
      try {
        const downloadedName = this.toDownloadedName(pipelineId, fileName);
        const downloadedPath = path4.join(LLAMA_CLOUD_OUTPUT_DIR, downloadedName);
        if (fs5.existsSync(downloadedPath)) return;
        const urlToDownload = yield this.getFileUrlByName(pipelineId, fileName);
        if (!urlToDownload) throw new Error("File not found in LlamaCloud");
        const file = fs5.createWriteStream(downloadedPath);
        https.get(urlToDownload, (response) => {
          response.pipe(file);
          file.on("finish", () => {
            file.close(() => {
              console.log("File downloaded successfully");
            });
          });
        }).on("error", (err) => {
          fs5.unlink(downloadedPath, () => {
            console.error("Error downloading file:", err);
            throw err;
          });
        });
      } catch (error) {
        throw new Error(`Error downloading file from LlamaCloud: ${error}`);
      }
    });
  }
  static getFileUrlByName(pipelineId, name) {
    return __async(this, null, function* () {
      const files = yield this.getAllFiles(pipelineId);
      const file = files.find((file2) => file2.name === name);
      if (!file) return null;
      return yield this.getFileUrlById(file.project_id, file.file_id);
    });
  }
  static getFileUrlById(projectId, fileId) {
    return __async(this, null, function* () {
      const url = `${LLAMA_CLOUD_BASE_URL}/files/${fileId}/content?project_id=${projectId}`;
      const headers = {
        Accept: "application/json",
        Authorization: `Bearer ${process.env.LLAMA_CLOUD_API_KEY}`
      };
      const response = yield fetch(url, { method: "GET", headers });
      const data = yield response.json();
      return data.url;
    });
  }
  static getAllFiles(pipelineId) {
    return __async(this, null, function* () {
      const url = `${LLAMA_CLOUD_BASE_URL}/pipelines/${pipelineId}/files`;
      const headers = {
        Accept: "application/json",
        Authorization: `Bearer ${process.env.LLAMA_CLOUD_API_KEY}`
      };
      const response = yield fetch(url, { method: "GET", headers });
      const data = yield response.json();
      return data;
    });
  }
};

// src/controllers/llamaindex/streaming/events.ts
function appendSourceData(data, sourceNodes) {
  if (!(sourceNodes == null ? void 0 : sourceNodes.length)) return;
  try {
    const nodes = sourceNodes.map((node) => {
      var _a;
      return __spreadProps(__spreadValues({}, node.node.toMutableJSON()), {
        id: node.node.id_,
        score: (_a = node.score) != null ? _a : null,
        url: getNodeUrl(node.node.metadata)
      });
    });
    data.appendMessageAnnotation({
      type: "sources",
      data: {
        nodes
      }
    });
  } catch (error) {
    console.error("Error appending source data:", error);
  }
}
function appendEventData(data, title) {
  if (!title) return;
  data.appendMessageAnnotation({
    type: "events",
    data: {
      title
    }
  });
}
function appendToolData(data, toolCall, toolOutput) {
  data.appendMessageAnnotation({
    type: "tools",
    data: {
      toolCall: {
        id: toolCall.id,
        name: toolCall.name,
        input: toolCall.input
      },
      toolOutput: {
        output: toolOutput.output,
        isError: toolOutput.isError
      }
    }
  });
}
function createStreamTimeout(stream) {
  var _a;
  const timeout = Number((_a = process.env.STREAM_TIMEOUT) != null ? _a : 1e3 * 60 * 5);
  const t = setTimeout(() => {
    appendEventData(stream, `Stream timed out after ${timeout / 1e3} seconds`);
    stream.close();
  }, timeout);
  return t;
}
function createCallbackManager(stream) {
  const callbackManager = new CallbackManager();
  callbackManager.on("retrieve-end", (data) => {
    const { nodes, query } = data.detail;
    appendSourceData(stream, nodes);
    appendEventData(stream, `Retrieving context for query: '${query}'`);
    appendEventData(
      stream,
      `Retrieved ${nodes.length} sources to use as context for the query`
    );
    LLamaCloudFileService.downloadFiles(nodes);
  });
  callbackManager.on("llm-tool-call", (event) => {
    const { name, input } = event.detail.toolCall;
    const inputString = Object.entries(input).map(([key, value]) => `${key}: ${value}`).join(", ");
    appendEventData(
      stream,
      `Using tool: '${name}' with inputs: '${inputString}'`
    );
  });
  callbackManager.on("llm-tool-result", (event) => {
    const { toolCall, toolResult } = event.detail;
    appendToolData(stream, toolCall, toolResult);
  });
  return callbackManager;
}
function getNodeUrl(metadata) {
  if (!process.env.FILESERVER_URL_PREFIX) {
    console.warn(
      "FILESERVER_URL_PREFIX is not set. File URLs will not be generated."
    );
  }
  const fileName = metadata["file_name"];
  if (fileName && process.env.FILESERVER_URL_PREFIX) {
    const pipelineId = metadata["pipeline_id"];
    if (pipelineId && metadata["private"] == null) {
      const name = LLamaCloudFileService.toDownloadedName(pipelineId, fileName);
      return `${process.env.FILESERVER_URL_PREFIX}/output/llamacloud/${name}`;
    }
    const isPrivate = metadata["private"] === "true";
    const folder = isPrivate ? "output/uploaded" : "data";
    return `${process.env.FILESERVER_URL_PREFIX}/${folder}/${fileName}`;
  }
  return metadata["URL"];
}

// src/controllers/llamaindex/streaming/stream.ts
import {
  createCallbacksTransformer,
  createStreamDataTransformer,
  trimStartOfStreamHelper
} from "ai";

// src/controllers/llamaindex/streaming/suggestion.ts
import { Settings as Settings2 } from "llamaindex";
var NEXT_QUESTION_PROMPT_TEMPLATE = `You're a helpful assistant! Your task is to suggest the next question that user might ask. 
Here is the conversation history
---------------------
$conversation
---------------------
Given the conversation history, please give me $number_of_questions questions that you might ask next!
Your answer should be wrapped in three sticks which follows the following format:
\`\`\`
<question 1>
<question 2>\`\`\`
`;
var N_QUESTIONS_TO_GENERATE = 3;
function generateNextQuestions(_0) {
  return __async(this, arguments, function* (conversation, numberOfQuestions = N_QUESTIONS_TO_GENERATE) {
    const llm = Settings2.llm;
    const conversationText = conversation.map((message2) => `${message2.role}: ${message2.content}`).join("\n");
    const message = NEXT_QUESTION_PROMPT_TEMPLATE.replace(
      "$conversation",
      conversationText
    ).replace("$number_of_questions", numberOfQuestions.toString());
    try {
      const response = yield llm.complete({ prompt: message });
      const questions = extractQuestions(response.text);
      return questions;
    } catch (error) {
      console.error("Error: ", error);
      throw error;
    }
  });
}
function extractQuestions(text) {
  const contentMatch = text.match(new RegExp("```(.*?)```", "s"));
  const content = contentMatch ? contentMatch[1] : "";
  const questions = content.split("\n").map((question) => question.trim()).filter((question) => question !== "");
  return questions;
}

// src/controllers/llamaindex/streaming/stream.ts
function LlamaIndexStream(response, data, chatHistory, opts) {
  return createParser(response, data, chatHistory).pipeThrough(createCallbacksTransformer(opts == null ? void 0 : opts.callbacks)).pipeThrough(createStreamDataTransformer());
}
function createParser(res, data, chatHistory) {
  const it = res[Symbol.asyncIterator]();
  const trimStartOfStream = trimStartOfStreamHelper();
  let llmTextResponse = "";
  return new ReadableStream({
    pull(controller) {
      return __async(this, null, function* () {
        var _a2;
        const { value, done } = yield it.next();
        if (done) {
          controller.close();
          chatHistory.push({ role: "assistant", content: llmTextResponse });
          const questions = yield generateNextQuestions(chatHistory);
          if (questions.length > 0) {
            data.appendMessageAnnotation({
              type: "suggested_questions",
              data: questions
            });
          }
          data.close();
          return;
        }
        const text = trimStartOfStream((_a2 = value.delta) != null ? _a2 : "");
        if (text) {
          llmTextResponse += text;
          controller.enqueue(text);
        }
      });
    }
  });
}

// src/controllers/chat.controller.ts
var chat = (req, res) => __async(void 0, null, function* () {
  var _a;
  const vercelStreamData = new StreamData2();
  const streamTimeout = createStreamTimeout(vercelStreamData);
  try {
    const { messages } = req.body;
    const userMessage = messages.pop();
    if (!messages || !userMessage || userMessage.role !== "user") {
      return res.status(400).json({
        error: "messages are required in the request body and the last message must be from the user"
      });
    }
    let annotations = userMessage.annotations;
    if (!annotations) {
      annotations = (_a = messages.slice().reverse().find(
        (message) => message.role === "user" && message.annotations
      )) == null ? void 0 : _a.annotations;
    }
    const allAnnotations = [...messages, userMessage].flatMap(
      (message) => {
        var _a2;
        return (_a2 = message.annotations) != null ? _a2 : [];
      }
    );
    const ids = retrieveDocumentIds(allAnnotations);
    const chatEngine = yield createChatEngine(ids);
    const userMessageContent = convertMessageContent2(
      userMessage.content,
      annotations
    );
    const callbackManager = createCallbackManager(vercelStreamData);
    const response = yield Settings3.withCallbackManager(callbackManager, () => {
      return chatEngine.chat({
        message: userMessageContent,
        chatHistory: messages,
        stream: true
      });
    });
    const stream = LlamaIndexStream(
      response,
      vercelStreamData,
      messages
    );
    return streamToResponse(stream, res, {}, vercelStreamData);
  } catch (error) {
    console.error("[LlamaIndex]", error);
    return res.status(500).json({
      detail: error.message
    });
  } finally {
    clearTimeout(streamTimeout);
  }
});

// src/controllers/engine/settings.ts
import {
  Anthropic,
  Gemini,
  GeminiEmbedding,
  Groq,
  MistralAI,
  MistralAIEmbedding,
  OpenAI,
  OpenAIEmbedding,
  Settings as Settings4
} from "llamaindex";
import { HuggingFaceEmbedding } from "llamaindex/embeddings/HuggingFaceEmbedding";
import { OllamaEmbedding } from "llamaindex/embeddings/OllamaEmbedding";
import { Ollama } from "llamaindex/llm/ollama";
var CHUNK_SIZE = 512;
var CHUNK_OVERLAP = 20;
var initSettings = () => __async(void 0, null, function* () {
  console.log(`Using '${process.env.MODEL_PROVIDER}' model provider`);
  if (!process.env.MODEL || !process.env.EMBEDDING_MODEL) {
    throw new Error("'MODEL' and 'EMBEDDING_MODEL' env variables must be set.");
  }
  switch (process.env.MODEL_PROVIDER) {
    case "ollama":
      initOllama();
      break;
    case "groq":
      initGroq();
      break;
    case "anthropic":
      initAnthropic();
      break;
    case "gemini":
      initGemini();
      break;
    case "mistral":
      initMistralAI();
      break;
    case "azure-openai":
      initAzureOpenAI();
      break;
    default:
      initOpenAI();
      break;
  }
  Settings4.chunkSize = CHUNK_SIZE;
  Settings4.chunkOverlap = CHUNK_OVERLAP;
});
function initOpenAI() {
  var _a;
  Settings4.llm = new OpenAI({
    model: (_a = process.env.MODEL) != null ? _a : "gpt-4o-mini",
    maxTokens: process.env.LLM_MAX_TOKENS ? Number(process.env.LLM_MAX_TOKENS) : void 0
  });
  Settings4.embedModel = new OpenAIEmbedding({
    model: process.env.EMBEDDING_MODEL,
    dimensions: process.env.EMBEDDING_DIM ? parseInt(process.env.EMBEDDING_DIM) : void 0
  });
}
function initAzureOpenAI() {
  var _a, _b;
  const AZURE_OPENAI_MODEL_MAP = {
    "gpt-35-turbo": "gpt-3.5-turbo",
    "gpt-35-turbo-16k": "gpt-3.5-turbo-16k",
    "gpt-4o": "gpt-4o",
    "gpt-4": "gpt-4",
    "gpt-4-32k": "gpt-4-32k",
    "gpt-4-turbo": "gpt-4-turbo",
    "gpt-4-turbo-2024-04-09": "gpt-4-turbo",
    "gpt-4-vision-preview": "gpt-4-vision-preview",
    "gpt-4-1106-preview": "gpt-4-1106-preview",
    "gpt-4o-2024-05-13": "gpt-4o-2024-05-13"
  };
  const azureConfig = {
    apiKey: process.env.AZURE_OPENAI_KEY,
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || process.env.OPENAI_API_VERSION
  };
  Settings4.llm = new OpenAI({
    model: (_b = AZURE_OPENAI_MODEL_MAP[(_a = process.env.MODEL) != null ? _a : "gpt-35-turbo"]) != null ? _b : "gpt-3.5-turbo",
    maxTokens: process.env.LLM_MAX_TOKENS ? Number(process.env.LLM_MAX_TOKENS) : void 0,
    azure: __spreadProps(__spreadValues({}, azureConfig), {
      deployment: process.env.AZURE_OPENAI_LLM_DEPLOYMENT
    })
  });
  Settings4.embedModel = new OpenAIEmbedding({
    model: process.env.EMBEDDING_MODEL,
    dimensions: process.env.EMBEDDING_DIM ? parseInt(process.env.EMBEDDING_DIM) : void 0,
    azure: __spreadProps(__spreadValues({}, azureConfig), {
      deployment: process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT
    })
  });
}
function initOllama() {
  var _a, _b, _c;
  const config = {
    host: (_a = process.env.OLLAMA_BASE_URL) != null ? _a : "http://127.0.0.1:11434"
  };
  Settings4.llm = new Ollama({
    model: (_b = process.env.MODEL) != null ? _b : "",
    config
  });
  Settings4.embedModel = new OllamaEmbedding({
    model: (_c = process.env.EMBEDDING_MODEL) != null ? _c : "",
    config
  });
}
function initGroq() {
  const embedModelMap = {
    "all-MiniLM-L6-v2": "Xenova/all-MiniLM-L6-v2",
    "all-mpnet-base-v2": "Xenova/all-mpnet-base-v2"
  };
  const modelMap = {
    "llama3-8b": "llama3-8b-8192",
    "llama3-70b": "llama3-70b-8192",
    "mixtral-8x7b": "mixtral-8x7b-32768"
  };
  Settings4.llm = new Groq({
    model: modelMap[process.env.MODEL]
  });
  Settings4.embedModel = new HuggingFaceEmbedding({
    modelType: embedModelMap[process.env.EMBEDDING_MODEL]
  });
}
function initAnthropic() {
  const embedModelMap = {
    "all-MiniLM-L6-v2": "Xenova/all-MiniLM-L6-v2",
    "all-mpnet-base-v2": "Xenova/all-mpnet-base-v2"
  };
  Settings4.llm = new Anthropic({
    model: process.env.MODEL
  });
  Settings4.embedModel = new HuggingFaceEmbedding({
    modelType: embedModelMap[process.env.EMBEDDING_MODEL]
  });
}
function initGemini() {
  Settings4.llm = new Gemini({
    model: process.env.MODEL
  });
  Settings4.embedModel = new GeminiEmbedding({
    model: process.env.EMBEDDING_MODEL
  });
}
function initMistralAI() {
  Settings4.llm = new MistralAI({
    model: process.env.MODEL
  });
  Settings4.embedModel = new MistralAIEmbedding({
    model: process.env.EMBEDDING_MODEL
  });
}

// src/routes/chat.route.ts
var llmRouter = express.Router();
initSettings();
llmRouter.route("/").post(chat);
llmRouter.route("/request").post(chatRequest);
llmRouter.route("/config").get(chatConfig);
llmRouter.route("/upload").post(chatUpload);
var chat_route_default = llmRouter;

// index.ts
var app = express2();
var port = parseInt(process.env.PORT || "8000");
var env = process.env["NODE_ENV"];
var isDevelopment = !env || env === "development";
var prodCorsOrigin = process.env["PROD_CORS_ORIGIN"];
initObservability();
app.use(express2.json({ limit: "50mb" }));
if (isDevelopment) {
  console.warn("Running in development mode - allowing CORS for all origins");
  app.use(cors());
} else if (prodCorsOrigin) {
  console.log(
    `Running in production mode - allowing CORS for domain: ${prodCorsOrigin}`
  );
  const corsOptions = {
    origin: prodCorsOrigin
    // Restrict to production domain
  };
  app.use(cors(corsOptions));
} else {
  console.warn("Production CORS origin not set, defaulting to no CORS.");
}
app.use("/api/files/data", express2.static("data"));
app.use("/api/files/output", express2.static("output"));
app.use(express2.text());
app.get("/", (req, res) => {
  res.send("LlamaIndex Express Server");
});
app.use("/api/chat", chat_route_default);
app.listen(port, () => {
  console.log(`\u26A1\uFE0F[server]: Server is running at http://localhost:${port}`);
});

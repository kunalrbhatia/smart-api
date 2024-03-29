"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
var _http = require("http");
var _cors = _interopRequireDefault(require("cors"));
var _express = _interopRequireDefault(require("express"));
var _bodyParser = _interopRequireDefault(require("body-parser"));
var _httpErrors = _interopRequireDefault(require("http-errors"));
var _nodeCron = _interopRequireDefault(require("node-cron"));
var _apiService = require("./helpers/apiService");
var _constants = require("./helpers/constants");
var _functions = require("./helpers/functions");
var _dotenv = _interopRequireDefault(require("dotenv"));
var _app = require("./app.interface");
var _lodash = require("lodash");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
function _regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ _regeneratorRuntime = function _regeneratorRuntime() { return exports; }; var exports = {}, Op = Object.prototype, hasOwn = Op.hasOwnProperty, defineProperty = Object.defineProperty || function (obj, key, desc) { obj[key] = desc.value; }, $Symbol = "function" == typeof Symbol ? Symbol : {}, iteratorSymbol = $Symbol.iterator || "@@iterator", asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator", toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag"; function define(obj, key, value) { return Object.defineProperty(obj, key, { value: value, enumerable: !0, configurable: !0, writable: !0 }), obj[key]; } try { define({}, ""); } catch (err) { define = function define(obj, key, value) { return obj[key] = value; }; } function wrap(innerFn, outerFn, self, tryLocsList) { var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator, generator = Object.create(protoGenerator.prototype), context = new Context(tryLocsList || []); return defineProperty(generator, "_invoke", { value: makeInvokeMethod(innerFn, self, context) }), generator; } function tryCatch(fn, obj, arg) { try { return { type: "normal", arg: fn.call(obj, arg) }; } catch (err) { return { type: "throw", arg: err }; } } exports.wrap = wrap; var ContinueSentinel = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var IteratorPrototype = {}; define(IteratorPrototype, iteratorSymbol, function () { return this; }); var getProto = Object.getPrototypeOf, NativeIteratorPrototype = getProto && getProto(getProto(values([]))); NativeIteratorPrototype && NativeIteratorPrototype !== Op && hasOwn.call(NativeIteratorPrototype, iteratorSymbol) && (IteratorPrototype = NativeIteratorPrototype); var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(IteratorPrototype); function defineIteratorMethods(prototype) { ["next", "throw", "return"].forEach(function (method) { define(prototype, method, function (arg) { return this._invoke(method, arg); }); }); } function AsyncIterator(generator, PromiseImpl) { function invoke(method, arg, resolve, reject) { var record = tryCatch(generator[method], generator, arg); if ("throw" !== record.type) { var result = record.arg, value = result.value; return value && "object" == _typeof(value) && hasOwn.call(value, "__await") ? PromiseImpl.resolve(value.__await).then(function (value) { invoke("next", value, resolve, reject); }, function (err) { invoke("throw", err, resolve, reject); }) : PromiseImpl.resolve(value).then(function (unwrapped) { result.value = unwrapped, resolve(result); }, function (error) { return invoke("throw", error, resolve, reject); }); } reject(record.arg); } var previousPromise; defineProperty(this, "_invoke", { value: function value(method, arg) { function callInvokeWithMethodAndArg() { return new PromiseImpl(function (resolve, reject) { invoke(method, arg, resolve, reject); }); } return previousPromise = previousPromise ? previousPromise.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); } }); } function makeInvokeMethod(innerFn, self, context) { var state = "suspendedStart"; return function (method, arg) { if ("executing" === state) throw new Error("Generator is already running"); if ("completed" === state) { if ("throw" === method) throw arg; return { value: void 0, done: !0 }; } for (context.method = method, context.arg = arg;;) { var delegate = context.delegate; if (delegate) { var delegateResult = maybeInvokeDelegate(delegate, context); if (delegateResult) { if (delegateResult === ContinueSentinel) continue; return delegateResult; } } if ("next" === context.method) context.sent = context._sent = context.arg;else if ("throw" === context.method) { if ("suspendedStart" === state) throw state = "completed", context.arg; context.dispatchException(context.arg); } else "return" === context.method && context.abrupt("return", context.arg); state = "executing"; var record = tryCatch(innerFn, self, context); if ("normal" === record.type) { if (state = context.done ? "completed" : "suspendedYield", record.arg === ContinueSentinel) continue; return { value: record.arg, done: context.done }; } "throw" === record.type && (state = "completed", context.method = "throw", context.arg = record.arg); } }; } function maybeInvokeDelegate(delegate, context) { var methodName = context.method, method = delegate.iterator[methodName]; if (undefined === method) return context.delegate = null, "throw" === methodName && delegate.iterator["return"] && (context.method = "return", context.arg = undefined, maybeInvokeDelegate(delegate, context), "throw" === context.method) || "return" !== methodName && (context.method = "throw", context.arg = new TypeError("The iterator does not provide a '" + methodName + "' method")), ContinueSentinel; var record = tryCatch(method, delegate.iterator, context.arg); if ("throw" === record.type) return context.method = "throw", context.arg = record.arg, context.delegate = null, ContinueSentinel; var info = record.arg; return info ? info.done ? (context[delegate.resultName] = info.value, context.next = delegate.nextLoc, "return" !== context.method && (context.method = "next", context.arg = undefined), context.delegate = null, ContinueSentinel) : info : (context.method = "throw", context.arg = new TypeError("iterator result is not an object"), context.delegate = null, ContinueSentinel); } function pushTryEntry(locs) { var entry = { tryLoc: locs[0] }; 1 in locs && (entry.catchLoc = locs[1]), 2 in locs && (entry.finallyLoc = locs[2], entry.afterLoc = locs[3]), this.tryEntries.push(entry); } function resetTryEntry(entry) { var record = entry.completion || {}; record.type = "normal", delete record.arg, entry.completion = record; } function Context(tryLocsList) { this.tryEntries = [{ tryLoc: "root" }], tryLocsList.forEach(pushTryEntry, this), this.reset(!0); } function values(iterable) { if (iterable || "" === iterable) { var iteratorMethod = iterable[iteratorSymbol]; if (iteratorMethod) return iteratorMethod.call(iterable); if ("function" == typeof iterable.next) return iterable; if (!isNaN(iterable.length)) { var i = -1, next = function next() { for (; ++i < iterable.length;) if (hasOwn.call(iterable, i)) return next.value = iterable[i], next.done = !1, next; return next.value = undefined, next.done = !0, next; }; return next.next = next; } } throw new TypeError(_typeof(iterable) + " is not iterable"); } return GeneratorFunction.prototype = GeneratorFunctionPrototype, defineProperty(Gp, "constructor", { value: GeneratorFunctionPrototype, configurable: !0 }), defineProperty(GeneratorFunctionPrototype, "constructor", { value: GeneratorFunction, configurable: !0 }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, toStringTagSymbol, "GeneratorFunction"), exports.isGeneratorFunction = function (genFun) { var ctor = "function" == typeof genFun && genFun.constructor; return !!ctor && (ctor === GeneratorFunction || "GeneratorFunction" === (ctor.displayName || ctor.name)); }, exports.mark = function (genFun) { return Object.setPrototypeOf ? Object.setPrototypeOf(genFun, GeneratorFunctionPrototype) : (genFun.__proto__ = GeneratorFunctionPrototype, define(genFun, toStringTagSymbol, "GeneratorFunction")), genFun.prototype = Object.create(Gp), genFun; }, exports.awrap = function (arg) { return { __await: arg }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, asyncIteratorSymbol, function () { return this; }), exports.AsyncIterator = AsyncIterator, exports.async = function (innerFn, outerFn, self, tryLocsList, PromiseImpl) { void 0 === PromiseImpl && (PromiseImpl = Promise); var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList), PromiseImpl); return exports.isGeneratorFunction(outerFn) ? iter : iter.next().then(function (result) { return result.done ? result.value : iter.next(); }); }, defineIteratorMethods(Gp), define(Gp, toStringTagSymbol, "Generator"), define(Gp, iteratorSymbol, function () { return this; }), define(Gp, "toString", function () { return "[object Generator]"; }), exports.keys = function (val) { var object = Object(val), keys = []; for (var key in object) keys.push(key); return keys.reverse(), function next() { for (; keys.length;) { var key = keys.pop(); if (key in object) return next.value = key, next.done = !1, next; } return next.done = !0, next; }; }, exports.values = values, Context.prototype = { constructor: Context, reset: function reset(skipTempReset) { if (this.prev = 0, this.next = 0, this.sent = this._sent = undefined, this.done = !1, this.delegate = null, this.method = "next", this.arg = undefined, this.tryEntries.forEach(resetTryEntry), !skipTempReset) for (var name in this) "t" === name.charAt(0) && hasOwn.call(this, name) && !isNaN(+name.slice(1)) && (this[name] = undefined); }, stop: function stop() { this.done = !0; var rootRecord = this.tryEntries[0].completion; if ("throw" === rootRecord.type) throw rootRecord.arg; return this.rval; }, dispatchException: function dispatchException(exception) { if (this.done) throw exception; var context = this; function handle(loc, caught) { return record.type = "throw", record.arg = exception, context.next = loc, caught && (context.method = "next", context.arg = undefined), !!caught; } for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i], record = entry.completion; if ("root" === entry.tryLoc) return handle("end"); if (entry.tryLoc <= this.prev) { var hasCatch = hasOwn.call(entry, "catchLoc"), hasFinally = hasOwn.call(entry, "finallyLoc"); if (hasCatch && hasFinally) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } else if (hasCatch) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); } else { if (!hasFinally) throw new Error("try statement without catch or finally"); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } } } }, abrupt: function abrupt(type, arg) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) { var finallyEntry = entry; break; } } finallyEntry && ("break" === type || "continue" === type) && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc && (finallyEntry = null); var record = finallyEntry ? finallyEntry.completion : {}; return record.type = type, record.arg = arg, finallyEntry ? (this.method = "next", this.next = finallyEntry.finallyLoc, ContinueSentinel) : this.complete(record); }, complete: function complete(record, afterLoc) { if ("throw" === record.type) throw record.arg; return "break" === record.type || "continue" === record.type ? this.next = record.arg : "return" === record.type ? (this.rval = this.arg = record.arg, this.method = "return", this.next = "end") : "normal" === record.type && afterLoc && (this.next = afterLoc), ContinueSentinel; }, finish: function finish(finallyLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.finallyLoc === finallyLoc) return this.complete(entry.completion, entry.afterLoc), resetTryEntry(entry), ContinueSentinel; } }, "catch": function _catch(tryLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc === tryLoc) { var record = entry.completion; if ("throw" === record.type) { var thrown = record.arg; resetTryEntry(entry); } return thrown; } } throw new Error("illegal catch attempt"); }, delegateYield: function delegateYield(iterable, resultName, nextLoc) { return this.delegate = { iterator: values(iterable), resultName: resultName, nextLoc: nextLoc }, "next" === this.method && (this.arg = undefined), ContinueSentinel; } }, exports; }
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }
function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }
var app = (0, _express["default"])();
app.use(_bodyParser["default"].json());
app.use((0, _cors["default"])());
_dotenv["default"].config();
var server = (0, _http.createServer)(app);
server.listen(process.env.PORT, function () {});
app.get('/', function (req, res) {
  res.json({
    status: 'ok',
    lastUpdated: '2023-08-18, 00:33:00'
  });
});
process.on('uncaughtException', function (err) {});
var connections = [];
server.on('connection', function (connection) {
  connections.push(connection);
  connection.on('close', function () {
    return connections = connections.filter(function (curr) {
      return curr !== connection;
    });
  });
});
app.get('/kill', function (req, res) {
  setTimeout(function () {
    server.close(function () {
      process.exit(0);
    });
    setTimeout(function () {
      console.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
    connections.forEach(function (curr) {
      return curr.end();
    });
    setTimeout(function () {
      return connections.forEach(function (curr) {
        return curr.destroy();
      });
    }, 5000);
  }, 1000);
  res.send("Execution of the 'Kill Algo' command has been initiated.");
});
app.post('/closeTrade', /*#__PURE__*/function () {
  var _ref = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee(req, res) {
    return _regeneratorRuntime().wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          (0, _functions.setCred)(req);
          _context.next = 3;
          return (0, _apiService.closeTrade)(_app.TradeType.POSITIONAL);
        case 3:
          res.send({
            ok: 123
          });
        case 4:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return function (_x, _x2) {
    return _ref.apply(this, arguments);
  };
}());
app.post('/check-positions-to-close', /*#__PURE__*/function () {
  var _ref2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee2(req, res) {
    var currentPositions, positions, openPositions;
    return _regeneratorRuntime().wrap(function _callee2$(_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          (0, _functions.setCred)(req);
          _context2.next = 3;
          return (0, _apiService.getPositions)();
        case 3:
          currentPositions = _context2.sent;
          positions = (0, _lodash.get)(currentPositions, 'data', []) || [];
          openPositions = (0, _functions.getOpenPositions)(positions);
          (0, _apiService.checkPositionToClose)({
            openPositions: openPositions,
            tradeType: _app.TradeType.INTRADAY
          });
          res.send().status(200);
        case 8:
        case "end":
          return _context2.stop();
      }
    }, _callee2);
  }));
  return function (_x3, _x4) {
    return _ref2.apply(this, arguments);
  };
}());
app.post('/run-rsi-algo', /*#__PURE__*/function () {
  var _ref3 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee3(req, res) {
    var istTz, response;
    return _regeneratorRuntime().wrap(function _callee3$(_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          _context3.prev = 0;
          istTz = new Date().toLocaleString('default', {
            timeZone: 'Asia/Kolkata'
          });
          (0, _functions.setCred)(req);
          _context3.next = 5;
          return (0, _apiService.runRsiAlgo)();
        case 5:
          response = _context3.sent;
          //console.log(`response: ${response}`);
          res.send({
            response: response
          });
          _context3.next = 12;
          break;
        case 9:
          _context3.prev = 9;
          _context3.t0 = _context3["catch"](0);
          res.send({
            response: _context3.t0
          });
        case 12:
        case "end":
          return _context3.stop();
      }
    }, _callee3, null, [[0, 9]]);
  }));
  return function (_x5, _x6) {
    return _ref3.apply(this, arguments);
  };
}());
app.post('/run-short-straddle-algo', /*#__PURE__*/function () {
  var _ref4 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee4(req, res) {
    var istTz, response;
    return _regeneratorRuntime().wrap(function _callee4$(_context4) {
      while (1) switch (_context4.prev = _context4.next) {
        case 0:
          _context4.prev = 0;
          istTz = new Date().toLocaleString('default', {
            timeZone: 'Asia/Kolkata'
          });
          (0, _functions.setCred)(req);
          _context4.next = 5;
          return (0, _apiService.checkMarketConditionsAndExecuteTrade)(_app.TradeType.INTRADAY);
        case 5:
          response = _context4.sent;
          res.send({
            response: response
          });
          _context4.next = 12;
          break;
        case 9:
          _context4.prev = 9;
          _context4.t0 = _context4["catch"](0);
          res.send({
            response: _context4.t0
          });
        case 12:
        case "end":
          return _context4.stop();
      }
    }, _callee4, null, [[0, 9]]);
  }));
  return function (_x7, _x8) {
    return _ref4.apply(this, arguments);
  };
}());
app.post('/orb', /*#__PURE__*/function () {
  var _ref5 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee5(req, res) {
    var istTz, scriptName, price, maxSl, trailSl, tradeDirection, response;
    return _regeneratorRuntime().wrap(function _callee5$(_context5) {
      while (1) switch (_context5.prev = _context5.next) {
        case 0:
          _context5.prev = 0;
          istTz = new Date().toLocaleString('default', {
            timeZone: 'Asia/Kolkata'
          });
          (0, _functions.setCred)(req);
          scriptName = req.body.script_name;
          price = req.body.price;
          maxSl = req.body.max_sl || -2000;
          trailSl = req.body.trail_sl || 500;
          tradeDirection = req.body.trade_direction;
          _context5.next = 10;
          return (0, _apiService.runOrb)({
            scriptName: scriptName,
            price: price,
            maxSl: maxSl,
            tradeDirection: tradeDirection,
            trailSl: trailSl
          });
        case 10:
          response = _context5.sent;
          res.send(response);
          _context5.next = 17;
          break;
        case 14:
          _context5.prev = 14;
          _context5.t0 = _context5["catch"](0);
          res.send({
            response: _context5.t0
          });
        case 17:
        case "end":
          return _context5.stop();
      }
    }, _callee5, null, [[0, 14]]);
  }));
  return function (_x9, _x10) {
    return _ref5.apply(this, arguments);
  };
}());
app.post('/run-short-straddle-positional-algo', /*#__PURE__*/function () {
  var _ref6 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee6(req, res) {
    var istTz, response;
    return _regeneratorRuntime().wrap(function _callee6$(_context6) {
      while (1) switch (_context6.prev = _context6.next) {
        case 0:
          _context6.prev = 0;
          istTz = new Date().toLocaleString('default', {
            timeZone: 'Asia/Kolkata'
          });
          (0, _functions.setCred)(req);
          _context6.next = 5;
          return (0, _apiService.checkMarketConditionsAndExecuteTrade)(_app.TradeType.POSITIONAL);
        case 5:
          response = _context6.sent;
          // console.log(`response: ${response}`);
          res.send({
            response: response
          });
          _context6.next = 12;
          break;
        case 9:
          _context6.prev = 9;
          _context6.t0 = _context6["catch"](0);
          res.send({
            response: _context6.t0
          });
        case 12:
        case "end":
          return _context6.stop();
      }
    }, _callee6, null, [[0, 9]]);
  }));
  return function (_x11, _x12) {
    return _ref6.apply(this, arguments);
  };
}());
if (process.env.NODE_ENV === 'development') {
  _nodeCron["default"].schedule('*/5 * * * *', /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee7() {
    var _process$env$API_KEY, _process$env$CLIENT_C, _process$env$CLIENT_P, _process$env$CLIENT_T, istTz, body, req, response;
    return _regeneratorRuntime().wrap(function _callee7$(_context7) {
      while (1) switch (_context7.prev = _context7.next) {
        case 0:
          _context7.prev = 0;
          istTz = new Date().toLocaleString('default', {
            timeZone: 'Asia/Kolkata'
          });
          body = {
            api_key: (_process$env$API_KEY = process.env.API_KEY) !== null && _process$env$API_KEY !== void 0 ? _process$env$API_KEY : '',
            client_code: (_process$env$CLIENT_C = process.env.CLIENT_CODE) !== null && _process$env$CLIENT_C !== void 0 ? _process$env$CLIENT_C : '',
            client_pin: (_process$env$CLIENT_P = process.env.CLIENT_PIN) !== null && _process$env$CLIENT_P !== void 0 ? _process$env$CLIENT_P : '',
            client_totp_pin: (_process$env$CLIENT_T = process.env.CLIENT_TOTP_PIN) !== null && _process$env$CLIENT_T !== void 0 ? _process$env$CLIENT_T : ''
          };
          req = {
            body: body
          };
          (0, _functions.setCred)(req);
          _context7.next = 7;
          return (0, _apiService.checkMarketConditionsAndExecuteTrade)(_app.TradeType.INTRADAY);
        case 7:
          response = _context7.sent;
          _context7.next = 12;
          break;
        case 10:
          _context7.prev = 10;
          _context7.t0 = _context7["catch"](0);
        case 12:
        case "end":
          return _context7.stop();
      }
    }, _callee7, null, [[0, 10]]);
  })));
}
app.post('/get-atm-strike-price', /*#__PURE__*/function () {
  var _ref8 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee8(req, res) {
    return _regeneratorRuntime().wrap(function _callee8$(_context8) {
      while (1) switch (_context8.prev = _context8.next) {
        case 0:
          (0, _functions.setCred)(req);
          _context8.t0 = res;
          _context8.next = 4;
          return (0, _functions.getAtmStrikePrice)();
        case 4:
          _context8.t1 = _context8.sent;
          _context8.t2 = {
            atm: _context8.t1
          };
          _context8.t0.json.call(_context8.t0, _context8.t2);
        case 7:
        case "end":
          return _context8.stop();
      }
    }, _callee8);
  }));
  return function (_x13, _x14) {
    return _ref8.apply(this, arguments);
  };
}());
app.post('/script/details/get-script-ltp', /*#__PURE__*/function () {
  var _ref9 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee9(req, res) {
    var tradingsymbol, exchange, symboltoken, ltpData;
    return _regeneratorRuntime().wrap(function _callee9$(_context9) {
      while (1) switch (_context9.prev = _context9.next) {
        case 0:
          (0, _functions.setCred)(req);
          tradingsymbol = req.body.tradingsymbol;
          exchange = req.body.exchange;
          symboltoken = req.body.symboltoken;
          _context9.next = 6;
          return (0, _apiService.getLtpData)({
            exchange: exchange,
            symboltoken: symboltoken,
            tradingsymbol: tradingsymbol
          });
        case 6:
          ltpData = _context9.sent;
          res.send(ltpData);
        case 8:
        case "end":
          return _context9.stop();
      }
    }, _callee9);
  }));
  return function (_x15, _x16) {
    return _ref9.apply(this, arguments);
  };
}());
app.post('/scrip/details/get-script', /*#__PURE__*/function () {
  var _ref10 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee10(req, res) {
    var scriptName, strikePrice, optionType, expiryDate;
    return _regeneratorRuntime().wrap(function _callee10$(_context10) {
      while (1) switch (_context10.prev = _context10.next) {
        case 0:
          (0, _functions.setCred)(req);
          scriptName = req.body.scriptName;
          strikePrice = req.body.strikePrice;
          optionType = req.body.optionType || '';
          expiryDate = req.body.expiryDate;
          _context10.t0 = res;
          _context10.next = 8;
          return (0, _apiService.getScrip)({
            scriptName: scriptName,
            strikePrice: strikePrice,
            optionType: optionType,
            expiryDate: expiryDate
          });
        case 8:
          _context10.t1 = _context10.sent;
          _context10.t0.send.call(_context10.t0, _context10.t1);
        case 10:
        case "end":
          return _context10.stop();
      }
    }, _callee10);
  }));
  return function (_x17, _x18) {
    return _ref10.apply(this, arguments);
  };
}());
app.post('/get-positions', /*#__PURE__*/function () {
  var _ref11 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee11(req, res) {
    var response;
    return _regeneratorRuntime().wrap(function _callee11$(_context11) {
      while (1) switch (_context11.prev = _context11.next) {
        case 0:
          (0, _functions.setCred)(req);
          _context11.next = 3;
          return (0, _apiService.getPositionsJson)(_app.TradeType.POSITIONAL);
        case 3:
          response = _context11.sent;
          res.send(response);
        case 5:
        case "end":
          return _context11.stop();
      }
    }, _callee11);
  }));
  return function (_x19, _x20) {
    return _ref11.apply(this, arguments);
  };
}());
app.post('/calc-mtm', /*#__PURE__*/function () {
  var _ref12 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee12(req, res) {
    var response;
    return _regeneratorRuntime().wrap(function _callee12$(_context12) {
      while (1) switch (_context12.prev = _context12.next) {
        case 0:
          (0, _functions.setCred)(req);
          _context12.next = 3;
          return (0, _apiService.calculateMtm)({
            data: (0, _functions.readJsonFile)(_app.TradeType.INTRADAY)
          });
        case 3:
          response = _context12.sent;
          res.jsonp({
            mtm: response
          });
        case 5:
        case "end":
          return _context12.stop();
      }
    }, _callee12);
  }));
  return function (_x21, _x22) {
    return _ref12.apply(this, arguments);
  };
}());
app.use(function (req, res, next) {
  next(new _httpErrors["default"].NotFound());
});
var errorHandler = function errorHandler(err, req, res, next) {
  res.status(err.status || 500);
  res.send({
    status: err.status || 500,
    message: err.message
  });
};
app.use(errorHandler);
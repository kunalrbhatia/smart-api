"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TradeType = exports.Strategy = exports.OptionType = exports.HistoryInterval = exports.CheckOptionType = void 0;
var HistoryInterval = /*#__PURE__*/function (HistoryInterval) {
  HistoryInterval["ONE_MINUTE"] = "ONE_MINUTE";
  HistoryInterval["THREE_MINUTE"] = "THREE_MINUTE";
  HistoryInterval["FIVE_MINUTE"] = "FIVE_MINUTE";
  HistoryInterval["TEN_MINUTE"] = "TEN_MINUTE";
  HistoryInterval["FIFTEEN_MINUTE"] = "FIFTEEN_MINUTE";
  HistoryInterval["THIRTY_MINUTE"] = "THIRTY_MINUTE";
  HistoryInterval["ONE_HOUR"] = "ONE_HOUR";
  HistoryInterval["ONE_DAY"] = "ONE_DAY";
  return HistoryInterval;
}({});
exports.HistoryInterval = HistoryInterval;
var TradeType = /*#__PURE__*/function (TradeType) {
  TradeType["POSITIONAL"] = "positional";
  TradeType["INTRADAY"] = "intraday";
  return TradeType;
}({});
exports.TradeType = TradeType;
var Strategy = /*#__PURE__*/function (Strategy) {
  Strategy["RSI"] = "rsi";
  Strategy["SHORTSTRADDLE"] = "shortStraddle";
  return Strategy;
}({});
exports.Strategy = Strategy;
var OptionType = /*#__PURE__*/function (OptionType) {
  OptionType["CE"] = "CE";
  OptionType["PE"] = "PE";
  return OptionType;
}({});
exports.OptionType = OptionType;
var CheckOptionType = /*#__PURE__*/function (CheckOptionType) {
  CheckOptionType["BOTH_CE_PE_PRESENT"] = "both_present";
  CheckOptionType["ONLY_CE_PRESENT"] = "ce_present";
  CheckOptionType["ONLY_PE_PRESENT"] = "pe_present";
  CheckOptionType["BOTH_CE_PE_NOT_PRESENT"] = "ce_pe_not_present";
  return CheckOptionType;
}({});
exports.CheckOptionType = CheckOptionType;
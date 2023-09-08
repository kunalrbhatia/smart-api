"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TradeType = exports.OptionType = exports.CheckOptionType = void 0;
var TradeType = /*#__PURE__*/function (TradeType) {
  TradeType["POSITIONAL"] = "positional";
  TradeType["INTRADAY"] = "intraday";
  return TradeType;
}({});
exports.TradeType = TradeType;
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
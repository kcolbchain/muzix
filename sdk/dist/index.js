"use strict";
/**
 * Muzix SDK - TypeScript SDK for Muzix chain integration
 *
 * This SDK provides a simple interface for music apps to interact with Muzix chain:
 * - Mint MUSD stablecoin
 * - Create and manage catalog tokens
 * - Query royalty splits
 * - Submit streaming data
 *
 * Built on top of viem for Ethereum interaction
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VERSION = exports.Streaming = exports.Royalty = exports.Catalog = exports.MUSD = exports.MuzixClient = void 0;
var client_1 = require("./client");
Object.defineProperty(exports, "MuzixClient", { enumerable: true, get: function () { return client_1.MuzixClient; } });
var musd_1 = require("./musd");
Object.defineProperty(exports, "MUSD", { enumerable: true, get: function () { return musd_1.MUSD; } });
var catalog_1 = require("./catalog");
Object.defineProperty(exports, "Catalog", { enumerable: true, get: function () { return catalog_1.Catalog; } });
var royalty_1 = require("./royalty");
Object.defineProperty(exports, "Royalty", { enumerable: true, get: function () { return royalty_1.Royalty; } });
var streaming_1 = require("./streaming");
Object.defineProperty(exports, "Streaming", { enumerable: true, get: function () { return streaming_1.Streaming; } });
// Re-export types
__exportStar(require("./types"), exports);
// Version
exports.VERSION = '0.1.0';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7Ozs7O0dBVUc7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUgsbUNBQXVDO0FBQTlCLHFHQUFBLFdBQVcsT0FBQTtBQUNwQiwrQkFBOEI7QUFBckIsNEZBQUEsSUFBSSxPQUFBO0FBQ2IscUNBQW9DO0FBQTNCLGtHQUFBLE9BQU8sT0FBQTtBQUNoQixxQ0FBb0M7QUFBM0Isa0dBQUEsT0FBTyxPQUFBO0FBQ2hCLHlDQUF3QztBQUEvQixzR0FBQSxTQUFTLE9BQUE7QUFFbEIsa0JBQWtCO0FBQ2xCLDBDQUF3QjtBQUV4QixVQUFVO0FBQ0csUUFBQSxPQUFPLEdBQUcsT0FBTyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBNdXppeCBTREsgLSBUeXBlU2NyaXB0IFNESyBmb3IgTXV6aXggY2hhaW4gaW50ZWdyYXRpb25cbiAqIFxuICogVGhpcyBTREsgcHJvdmlkZXMgYSBzaW1wbGUgaW50ZXJmYWNlIGZvciBtdXNpYyBhcHBzIHRvIGludGVyYWN0IHdpdGggTXV6aXggY2hhaW46XG4gKiAtIE1pbnQgTVVTRCBzdGFibGVjb2luXG4gKiAtIENyZWF0ZSBhbmQgbWFuYWdlIGNhdGFsb2cgdG9rZW5zXG4gKiAtIFF1ZXJ5IHJveWFsdHkgc3BsaXRzXG4gKiAtIFN1Ym1pdCBzdHJlYW1pbmcgZGF0YVxuICogXG4gKiBCdWlsdCBvbiB0b3Agb2YgdmllbSBmb3IgRXRoZXJldW0gaW50ZXJhY3Rpb25cbiAqL1xuXG5leHBvcnQgeyBNdXppeENsaWVudCB9IGZyb20gJy4vY2xpZW50JztcbmV4cG9ydCB7IE1VU0QgfSBmcm9tICcuL211c2QnO1xuZXhwb3J0IHsgQ2F0YWxvZyB9IGZyb20gJy4vY2F0YWxvZyc7XG5leHBvcnQgeyBSb3lhbHR5IH0gZnJvbSAnLi9yb3lhbHR5JztcbmV4cG9ydCB7IFN0cmVhbWluZyB9IGZyb20gJy4vc3RyZWFtaW5nJztcblxuLy8gUmUtZXhwb3J0IHR5cGVzXG5leHBvcnQgKiBmcm9tICcuL3R5cGVzJztcblxuLy8gVmVyc2lvblxuZXhwb3J0IGNvbnN0IFZFUlNJT04gPSAnMC4xLjAnO1xuIl19
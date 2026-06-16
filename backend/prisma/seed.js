"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var prisma_1 = require("../src/generated/prisma");
var adapter_pg_1 = require("@prisma/adapter-pg");
var pg_1 = require("pg");
var dotenv = __importStar(require("dotenv"));
dotenv.config();
var pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
var adapter = new adapter_pg_1.PrismaPg(pool);
var prisma = new prisma_1.PrismaClient({ adapter: adapter });
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var configs, _i, configs_1, config, categories, _a, categories_1, cat, devices, _b, devices_1, device, existing, areas, _c, areas_1, area, existing, slots, _d, slots_1, slot, admins, _e, admins_1, adminEmail;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    console.log('🌱 Seeding V2 database...');
                    configs = [
                        { key: 'booking_enabled', value: 'true', description: 'Enable or disable customer bookings' },
                        { key: 'same_day_booking', value: 'true', description: 'Allow customer to book same-day repairs' },
                        { key: 'max_bookings_per_day', value: '10', description: 'Maximum customer bookings allowed per day' },
                        { key: 'upi_enabled', value: 'true', description: 'Enable or disable UPI payment option' },
                        { key: 'cash_enabled', value: 'true', description: 'Enable or disable cash payment option' },
                        { key: 'qr_enabled', value: 'true', description: 'Enable or disable QR payment option' },
                        { key: 'qr_image_url', value: 'assets/qr-code-placeholder.png', description: 'URL or path to static QR Code image' },
                        { key: 'review_mandatory', value: 'false', description: 'Require reviews after successful repair completion' },
                    ];
                    _i = 0, configs_1 = configs;
                    _f.label = 1;
                case 1:
                    if (!(_i < configs_1.length)) return [3 /*break*/, 4];
                    config = configs_1[_i];
                    return [4 /*yield*/, prisma.appConfig.upsert({
                            where: { key: config.key },
                            update: { value: config.value, description: config.description },
                            create: config,
                        })];
                case 2:
                    _f.sent();
                    console.log("  \u2705 Config: ".concat(config.key, " = ").concat(config.value));
                    _f.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4:
                    categories = [
                        { name: 'Screen Replacement', description: 'Cracked, broken, or unresponsive touch screen repairs' },
                        { name: 'Battery Replacement', description: 'Low health, swollen, or fast-draining battery replacement' },
                        { name: 'Charging Issue', description: 'Charging port cleaning, repair, or charging port swap' },
                        { name: 'Speaker Repair', description: 'Muffled, crackly, or non-functional speaker repairs' },
                        { name: 'Microphone Repair', description: 'Low volume, crackly, or completely silent mic fixes' },
                        { name: 'Camera Repair', description: 'Front or rear camera lens, sensor, or glass replacement' },
                        { name: 'Water Damage', description: 'Diagnostics, ultrasonic cleaning, and circuit repair for liquid ingress' },
                        { name: 'Software Issue', description: 'Bootloops, OS upgrades, factory resets, or data backup assistance' },
                        { name: 'Data Recovery', description: 'Retrieval of files, photos, and contacts from dead or broken devices' },
                        { name: 'Other', description: 'General diagnosis and custom repair solutions' },
                    ];
                    _a = 0, categories_1 = categories;
                    _f.label = 5;
                case 5:
                    if (!(_a < categories_1.length)) return [3 /*break*/, 8];
                    cat = categories_1[_a];
                    return [4 /*yield*/, prisma.serviceCategory.upsert({
                            where: { name: cat.name },
                            update: { description: cat.description, isActive: true },
                            create: __assign(__assign({}, cat), { isActive: true }),
                        })];
                case 6:
                    _f.sent();
                    console.log("  \u2705 Service Category: ".concat(cat.name));
                    _f.label = 7;
                case 7:
                    _a++;
                    return [3 /*break*/, 5];
                case 8:
                    devices = [
                        { brand: 'Apple', model: 'iPhone 15 Pro' },
                        { brand: 'Samsung', model: 'Galaxy S24 Ultra' },
                        { brand: 'Google', model: 'Pixel 8 Pro' },
                        { brand: 'OnePlus', model: 'OnePlus 12' },
                    ];
                    _b = 0, devices_1 = devices;
                    _f.label = 9;
                case 9:
                    if (!(_b < devices_1.length)) return [3 /*break*/, 14];
                    device = devices_1[_b];
                    return [4 /*yield*/, prisma.device.findFirst({
                            where: { brand: device.brand, model: device.model },
                        })];
                case 10:
                    existing = _f.sent();
                    if (!!existing) return [3 /*break*/, 12];
                    return [4 /*yield*/, prisma.device.create({ data: device })];
                case 11:
                    _f.sent();
                    console.log("  \u2705 Device: ".concat(device.brand, " ").concat(device.model));
                    return [3 /*break*/, 13];
                case 12:
                    console.log("  \u23ED\uFE0F  Device exists: ".concat(device.brand, " ").concat(device.model));
                    _f.label = 13;
                case 13:
                    _b++;
                    return [3 /*break*/, 9];
                case 14:
                    areas = [
                        { name: 'ECIL', city: 'Hyderabad', travelCharge: 0 },
                        { name: 'Nagaram', city: 'Hyderabad', travelCharge: 0 },
                        { name: 'AS Rao Nagar', city: 'Hyderabad', travelCharge: 0 },
                        { name: 'Sainikpuri', city: 'Hyderabad', travelCharge: 0 },
                        { name: 'Tarnaka', city: 'Hyderabad', travelCharge: 0 },
                        { name: 'Uppal', city: 'Hyderabad', travelCharge: 0 },
                        { name: 'Habsiguda', city: 'Hyderabad', travelCharge: 0 },
                        { name: 'Hitech City', city: 'Hyderabad', travelCharge: 199 },
                        { name: 'Gachibowli', city: 'Hyderabad', travelCharge: 199 },
                        { name: 'Kondapur', city: 'Hyderabad', travelCharge: 199 },
                    ];
                    _c = 0, areas_1 = areas;
                    _f.label = 15;
                case 15:
                    if (!(_c < areas_1.length)) return [3 /*break*/, 21];
                    area = areas_1[_c];
                    return [4 /*yield*/, prisma.serviceArea.findFirst({
                            where: { name: area.name, city: area.city },
                        })];
                case 16:
                    existing = _f.sent();
                    if (!!existing) return [3 /*break*/, 18];
                    return [4 /*yield*/, prisma.serviceArea.create({
                            data: {
                                name: area.name,
                                city: area.city,
                                travelCharge: area.travelCharge,
                                isActive: true,
                            },
                        })];
                case 17:
                    _f.sent();
                    console.log("  \u2705 Service Area: ".concat(area.name, " (\u20B9").concat(area.travelCharge, ")"));
                    return [3 /*break*/, 20];
                case 18: return [4 /*yield*/, prisma.serviceArea.update({
                        where: { id: existing.id },
                        data: { travelCharge: area.travelCharge, isActive: true },
                    })];
                case 19:
                    _f.sent();
                    console.log("  \u23ED\uFE0F  Service Area updated: ".concat(area.name));
                    _f.label = 20;
                case 20:
                    _c++;
                    return [3 /*break*/, 15];
                case 21:
                    slots = [
                        { name: '09:00 AM', startTime: '09:00', endTime: '11:00', maxBookings: 5 },
                        { name: '11:00 AM', startTime: '11:00', endTime: '13:00', maxBookings: 5 },
                        { name: '01:00 PM', startTime: '13:00', endTime: '15:00', maxBookings: 5 },
                        { name: '03:00 PM', startTime: '15:00', endTime: '17:00', maxBookings: 5 },
                        { name: '05:00 PM', startTime: '17:00', endTime: '19:00', maxBookings: 5 },
                    ];
                    _d = 0, slots_1 = slots;
                    _f.label = 22;
                case 22:
                    if (!(_d < slots_1.length)) return [3 /*break*/, 25];
                    slot = slots_1[_d];
                    return [4 /*yield*/, prisma.slot.upsert({
                            where: { name: slot.name },
                            update: { startTime: slot.startTime, endTime: slot.endTime, maxBookings: slot.maxBookings, isActive: true },
                            create: __assign(__assign({}, slot), { isActive: true }),
                        })];
                case 23:
                    _f.sent();
                    console.log("  \u2705 Slot: ".concat(slot.name));
                    _f.label = 24;
                case 24:
                    _d++;
                    return [3 /*break*/, 22];
                case 25:
                    admins = ['admin@doorstep.com', 'admin@demo.com'];
                    _e = 0, admins_1 = admins;
                    _f.label = 26;
                case 26:
                    if (!(_e < admins_1.length)) return [3 /*break*/, 29];
                    adminEmail = admins_1[_e];
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { email: adminEmail },
                            update: { role: 'admin' },
                            create: {
                                email: adminEmail,
                                name: adminEmail === 'admin@demo.com' ? 'Demo Admin' : 'Admin User',
                                role: 'admin',
                            },
                        })];
                case 27:
                    _f.sent();
                    console.log("  \u2705 Admin user upserted: ".concat(adminEmail));
                    _f.label = 28;
                case 28:
                    _e++;
                    return [3 /*break*/, 26];
                case 29:
                    console.log('\n🎉 Seeding completed successfully!');
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) {
    console.error('❌ Seed failed:', e);
    process.exit(1);
})
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, pool.end()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });

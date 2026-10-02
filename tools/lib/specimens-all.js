// Registers every engine element for specimen sheets.
import { banksia, casuarina, duneGrass, grassTree, gum, heath, norfolkPine } from "../../src/elements/natives.js";
import { specimen } from "./specimens.js";

specimen("gum", { box: [-110, -190, 220, 200], draw: (x, y) => gum(x, y, { hei: 130 }) });
specimen("heath", { box: [-40, -40, 80, 50], draw: (x, y) => heath(x, y, { size: 22 }) });
specimen("banksia", { box: [-45, -60, 90, 70], draw: (x, y) => banksia(x, y, { size: 26 }) });
specimen("casuarina", { box: [-80, -120, 160, 130], draw: (x, y) => casuarina(x, y, { hei: 100 }) });
specimen("norfolkPine", { box: [-80, -190, 160, 200], draw: (x, y) => norfolkPine(x, y, { hei: 170 }) });
specimen("grassTree", { box: [-50, -110, 100, 120], draw: (x, y) => grassTree(x, y, { hei: 50 }) });
specimen("duneGrass", { box: [-30, -30, 60, 36], draw: (x, y) => duneGrass(x, y, { size: 14 }) });
import { boatShed, dinghy, flags, jetty, kiosk, lighthouse, oceanPool, sailboat, shack } from "../../src/elements/buildings.js";

specimen("lighthouse", { box: [-50, -80, 100, 90], draw: (x, y) => lighthouse(x, y, { hei: 70 }) });
specimen("kiosk", { box: [-50, -30, 100, 40], draw: (x, y) => kiosk(x, y, { wid: 70 }) });
specimen("shack", { box: [-30, -25, 60, 32], draw: (x, y) => shack(x, y, { wid: 36 }) });
specimen("boatShed", { box: [-28, -25, 56, 30], draw: (x, y) => boatShed(x, y, { wid: 32 }) });
specimen("jetty", { box: [-40, -100, 120, 112], draw: (x, y) => jetty(x, y, { len: 90, near: 0.8 }) });
specimen("oceanPool", { box: [-35, -16, 70, 24], draw: (x, y) => oceanPool(x, y, { wid: 50 }) });
specimen("flags", { box: [-45, -22, 90, 26], draw: (x, y) => flags(x, y, { gap: 60, hei: 14 }) });
specimen("sailboat", { box: [-30, -45, 60, 52], draw: (x, y) => sailboat(x, y, { len: 30 }) });
specimen("dinghy", { box: [-18, -8, 36, 14], draw: (x, y) => dinghy(x, y, { len: 20 }) });

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

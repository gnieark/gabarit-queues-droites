// Exécution sans navigateur : gjs -m tests/export-profile.js '{...}'
import GLib from 'gi://GLib';
globalThis.self = globalThis;
globalThis.navigator = { userAgent: 'Firefox', appName: 'Netscape' };
const { defaultsFromSCAD, validate } = await import('../js/parameters.js');
const { profile } = await import('../js/geometry.js');
const [, bytes] = GLib.file_get_contents('peigne.scad');
const parameters = {...defaultsFromSCAD(new TextDecoder().decode(bytes)), ...JSON.parse(ARGV[0] || '{}')};
const result = validate(parameters);
if (result.errors.length) throw new Error(JSON.stringify(result.errors));
print(JSON.stringify(profile(parameters)));

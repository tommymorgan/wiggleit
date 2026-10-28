export function adapterVersion(release: string): 46 | 49 | 51 {
    const major = Number(release.split('.')[0]);
    switch (major) {
    case 46: case 47: case 48: return 46;
    case 49: case 50: return 49;
    case 51: return 51;
    default: throw new RangeError(`Unsupported GNOME Shell release: ${release}; supported majors are 46–51`);
    }
}

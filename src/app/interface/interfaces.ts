export interface Point {
        x: number;
        y: number;
}

export interface RawFile {
    fileName: string;
    filePath: string;
    signals: Point[][];
    baselines: Point[][];
    peaks: Peak[][];
}

export interface Peak {
    id: number;
    rt: number; // one digital after dot，display purpose, not accurate
    fwhm: number;
    height: number;
    area: number;
    startIndex: number;
    endIndex: number;
    peakIndex: number
}
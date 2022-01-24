import { Injectable } from '@angular/core';
import { Point, RawFile, Peak } from '../../interface/interfaces'

@Injectable({
  providedIn: 'root'
})
export class AnalysisService {

    constructor() {
     }
    
    calculateBaseLine(signals: Point[][], iter: number): Point[][] {
        let baselines: Point[][] = []
        for (let m = 0; m < signals.length; m++) {
            let signal = this.padding(signals[m])
            let length = signal.length
            let baselineValue: number[] = []
            let baseline: Point[] = []
            signal.forEach(data => {
                baselineValue.push(Math.log(Math.log(Math.sqrt(data.y + 1) + 1) + 1))
            })
    
            for(var i = 1; i <= iter; i++) {
                for(var j = i + 1; j < length - i; j++) {
                    baselineValue[j] = Math.min(baselineValue[j], (baselineValue[j + i] + baselineValue[j - i]) / 2.0)
                }
            }
    
            for(var i = 0; i < length; i++) {
                baselineValue[i] = Math.pow((Math.exp(Math.exp(baselineValue[i]) - 1) -1), 2) - 1
            }
    
            for(var i = 0; i < signal.length; i++) {
                let point: Point = {x: signal[i].x, y: baselineValue[i]}
                baseline.push(point)
            }
            baselines.push(this.unPadding(baseline))
        }
        return baselines
    }

    private padding(signal: Point[]) {
        let signalCopy: Point[] = [], len = signal.length;

        for (let i = 0; i < len; i++) {
            signalCopy.push(signal[i])
        }

        for (let i = 0; i < 20; i++) {
            signalCopy.unshift({x: signal[0].x, y: signal[0].y})
            signalCopy.push({x: signal[len - 1].x, y: signal[len - 1].y})
        }
        return signalCopy
    }

    private unPadding(signal: Point[]) {
        signal.splice(0, 20);
        signal.splice(signal.length - 20, 20)
        return signal
    }

    public sum(points : Point[]) {
        let sum = 0;
        for (let i = 0; i < points.length; i++) {
            sum += points[i].y;
        }
       
        return sum;
    }

    public denoise(signals: Point[][], windowHalfSize: number): Point[][] {
        let cleanSignal: Point[][] = []
        for (let i = 0; i < signals.length; i++) {
            let signal = signals[i]
            //signal.splice(0, 5)
            cleanSignal.push(this.movingAvg(signal, windowHalfSize))
        }
        return cleanSignal
    }

    private movingAvg(signal: Point[], windowHalfSize: number): Point[] {
        let newSignal :Point[] = [], sum = this.sum(signal.slice(0, 2 * windowHalfSize));
        for (let i = windowHalfSize; i < signal.length - windowHalfSize; i++) {
            newSignal.push({x: signal[i].x, y: sum / (2 * windowHalfSize + 1)});
            if (i + windowHalfSize + 1 < signal.length) {
                sum -= signal[i - windowHalfSize].y
                sum += signal[i + windowHalfSize + 1].y
            }
        }
        return newSignal
    }

    parseRawFile(content: string): Point[][] {
        let lines = content.split("\n")

        // 1th dimension is the signal of 1th dimension, etc
        let signals : Point[][] = []
        // non comprehensive: fft:1003,p1:1411.24,p2:2214.96,tmp1:1,tmp2:13
        // comprehensive: fft:1003,p1:1411.24,p2:2214.96,tmp1:1,tmp2:13,1
        for (let i = 0; i < lines.length; i++) {
            try {
                // “start”, "!", "?", etc
                if (lines[i].length <= 7) continue
                let tokens = lines[i].split(",")

                // comprehensive system has 4 column, non comprehensive system has 3 column
                if (tokens.length != 5 && tokens.length != 6) continue

                let crc = lines[i].substring(0, 2)
                if (crc != this.crc(lines[i].substring(2))) {
                    console.log("crc failed:" + lines[i])
                    console.log("expected value :" + this.crc(lines[i].substring(2)))
                    console.log("actual value :" + crc)
                    continue
                }
                let time = Number(tokens[0].split(":")[1].trim())
                let value1 = Number(tokens[1].split(":")[1].trim())
                let value2 = Number(tokens[2].split(":")[1].trim())
                let tmp1 = Number(tokens[3].split(":")[1].trim())
                let tmp2 = Number(tokens[4].split(":")[1].trim())
                //if (value1 < 5000 && value2 < 5000) {
                if (signals[0] == undefined) signals[0] = []
                signals[0].push({x: time, y: value1})

                if (signals[1] == undefined) signals[1] = []
                signals[1].push({x: time, y: value2})

                if (signals[2] == undefined) signals[2] = []
                signals[2].push({x: time, y: tmp1})

                if (signals[3] == undefined) signals[3] = []
                signals[3].push({x: time, y: tmp2})

                //}
                if (tokens.length == 6) {
                    // possible value 0, 1, 2
                    let value3 = Number(tokens[5].trim()) == 1? 1000 : 0
                    if (signals[4] == undefined) signals[4] = []
                    signals[4].push({x: time, y: value3})
                }
              
            } catch (err) {
                console.log(err)
            }
        }

        for (let i = 0; i < signals.length; i++) {
            if (signals[i].length > 0) {
                let startTime = signals[i][0].x
                for (let j = 0; j < signals[i].length; j++) {
                    let point : Point = signals[i][j]
                    point.x = (point.x - startTime) / 1000
                }
            }
        }
        return signals
    }

    findPeak(signals: Point[][], baselines: Point[][], peakThres: Number): Peak[][] {
        let result: Peak[][] = []
        let peakID = 0
        for (let m = 0; m < signals.length; m++) {

            let signal = signals[m]
            let baseline = baselines[m]
            console.log(signal)
            console.log(baseline)

            let peakIndexs: number[] = []
            let startPointIndexs: number[] = []
            let endPointIndexs: number[] = []
            let heights: number[] = []
            let areas = []
            let fwhms = []
            let peaks: Peak[] = []

            let time: number[] = []
            signal.forEach(point => {
                time.push(point.x)
            })

            let cleanSignal: number[] = []
            for(var i = 0; i < signal.length; i++) {
                cleanSignal.push(signal[i].y - baseline[i].y)
            }
    
            let diff = this.calculateDiff(cleanSignal)
    
            let curIndex = 0;
            while (curIndex < cleanSignal.length) {
                if(this.isStartPoint(curIndex, diff)) {
                    let currentPeakStartIndex = curIndex
                    let currentPeakIndex = this.findPeakIndex(currentPeakStartIndex, diff)
                    
                    if ((signal[currentPeakIndex].y - signal[currentPeakStartIndex].y) >= peakThres) {
                        let currentPeakEndIndex = this.findPeakEndIndex(currentPeakIndex, diff)
    
                        startPointIndexs.push(currentPeakStartIndex)
                        peakIndexs.push(currentPeakIndex)
                        endPointIndexs.push(currentPeakEndIndex)
                        heights.push(Number(cleanSignal[currentPeakIndex].toFixed(2)))
                        areas.push(this.calculateArea(cleanSignal, time, currentPeakStartIndex, currentPeakEndIndex))
                        fwhms.push(this.findFWHM(cleanSignal, time, currentPeakIndex))
                        curIndex = currentPeakEndIndex
                    } else curIndex++
                }else curIndex++
            }
    
            for(var i = 0; i < peakIndexs.length; i++) {
                peaks.push({id: ++peakID, rt: Number(time[peakIndexs[i]].toFixed(3)), fwhm: fwhms[i], height:heights[i], area: areas[i], startIndex: startPointIndexs[i], endIndex: endPointIndexs[i], peakIndex: peakIndexs[i]})
            }
            result.push(peaks)
        }
        return result
    }

    isStartPoint(point: number, diff: number[]): boolean {
        let winSize = 5;
        let thres = 0.000001
        if ((point + winSize -1) < (diff.length + 1)) {
            for(var i = point; i < point + winSize -1; i++) {
                if(diff[i] <= thres) return false
            }
            return true
        }
        return false
    }

    calculateDiff(data: number[]): number[] {
        let diff: number[] = []
        for(var i = 0; i < data.length - 1; i++) {
            diff.push(data[i + 1] - data[i])
        }
        return diff
    }

    findPeakIndex(startPoint: number, diff: number[]): number {
        let peakIndex = startPoint
        let length = diff.length
        while(peakIndex < length) {
            if (diff[peakIndex] >= 0) {
                peakIndex++
                continue
            } else {
                let isFakePeak = false
                for(var i = 0; i < 4; i++) {
                    if ((peakIndex + i < length) && (diff[peakIndex + i] > 0)) {
                        isFakePeak = true
                        break
                    }
                }
                if (isFakePeak) {
                    peakIndex++
                    continue
                } else {
                    break
                }
            }
        }
        return peakIndex
    }

    findPeakEndIndex(peakPosition: number, diff: number[]): number {
        let peakEndIndex = peakPosition
        length = diff.length
        while (peakEndIndex < length && !this.isEndingPoint(peakEndIndex, diff)) {
            peakEndIndex++
        }
        return peakEndIndex
    }

    findFWHM(signal: number[], time: number[], peakIndex: number) {

        let peakHeigh = signal[peakIndex]
        let leftThres = peakIndex
        let rightThres = peakIndex

        while (signal[leftThres] >= (peakHeigh / 2.0)) leftThres--
        while (signal[rightThres] >= (peakHeigh / 2.0)) rightThres++

        return Number((time[rightThres] - time[leftThres]).toFixed(3))
    }

    calculateArea(signal: number[], time: number[], startIndex: number, endIndex: number): number {
        let area = 0
        for(var i = startIndex; i < endIndex; i++) {
            let width = time[i + 1] - time[i]
            let height = signal[i]
            area += (width * height)
        }
        return Number(area.toFixed(3))
    }

    isEndingPoint(point, diff): boolean {
        for(var i = point; i < point + 10 - 1; i++) {
            if (diff[i] <= -0.001) return false
        }
        return true
    }

    public crc(str: string): string {
        str = str + "\n"
        var bytes = []
        for (var i = 0; i < str.length; i++) {
            bytes = bytes.concat(str.charCodeAt(i))
        }
       
        var crc = 0;
        for (var j = 0; j < bytes.length; j++){
                var extract = bytes[j];
                for (var i = 0; i < 8; i++)
                {
                    var sum = (crc ^ extract) & 0x01;
                    crc >>= 1;
                    if (sum != 0)
                    {
                        crc ^= 0x8c;
                    }
                    extract >>= 1;
                }
            }
            var res = crc.toString(16)
            if (res.length == 1) res = '0' + res
            return res;
    }
}

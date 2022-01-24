import { Component, OnInit } from '@angular/core';
import { EChartsOption } from 'echarts';
import { ElectronService } from '../../services/electron/electron.service';
import { AnalysisService } from '../../services/analysis/analysis.service';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { DialogPageComponent } from '../dialog-page/dialog-page.component';
import { RawFile, Peak, Point } from '../../interface/interfaces'
import { HttpService } from '../../services/http/http.service';
import { constants } from '../../constants/constants';

@Component({
  selector: 'app-analysis-page',
  templateUrl: './analysis-page.component.html',
  styleUrls: ['./analysis-page.component.scss']
})
export class AnalysisPageComponent implements OnInit {
    public peakThres: string
    public status: string = constants.NON_TESTING
    public rawFiles: RawFile[] = []
    public selectedFile: RawFile = {fileName: '', filePath: '', signals: [], baselines: [], peaks: []}
    
    public displayedColumns: string[] = ['id', 'rt', 'fwhm', 'height', 'area'];
    public chartOption: EChartsOption
    public syncFileJob : any;

    constructor(private electronService: ElectronService, private analysisService: AnalysisService, 
        private httpService: HttpService, public dialog: MatDialog) {
        this.loadRawFiles()
    }

    get flatPeaks(): Peak[] {
        if (this.selectedFile.peaks == undefined) return []
        else return this.selectedFile.peaks.reduce((accumulator, value) => accumulator.concat(value), [])
    }
    
    ngOnInit(): void {
    }

    ngOnDestroy() : void {
        clearTimeout(this.syncFileJob)
    }

    async getRealTimeData() {
        let realTimeData = await this.httpService.fetchRealTimeData()
        console.log("real time data " + realTimeData)
        if (realTimeData != "") {
            if (realTimeData.includes("start")) {
                this.status = constants.TESTING
            }
            this.visualizeUnderGoingTestData(realTimeData) // if contains "start", which will be handle in try catch block in analysis service
            if (!realTimeData.includes("?")) this.syncFileJob = setTimeout(async () => {await this.getRealTimeData()}, 1000)
            else {
                console.log("done")
                this.status = "Non-Testing"
            }
        } else {
            this.syncFileJob = setTimeout(async () => {await this.getRealTimeData()}, 1000)
        }
    }

    loadRawFiles(): void {
        this.rawFiles = []
        let filesPath = this.electronService.loadRawFiles()
        filesPath.forEach(path => {
            let name = path.split("\\")[2]
            this.rawFiles.push({fileName: name, filePath: path, signals: undefined, baselines: undefined, peaks: undefined})
        })
        this.rawFiles.push({fileName: 'Real Time Plot', filePath: undefined, signals: undefined, baselines: undefined, peaks: undefined})
    }

    loadAndVisualizeFile(filePath: string) {
        let content = this.electronService.readTextFile(filePath)
        this.selectedFile.signals = this.analysisService.parseRawFile(content)
        //this.selectedFile.signals = this.analysisService.denoise(this.selectedFile.signals, 2)
        // signals 包含 一维 二维 信号， 一维 二维 温度， modulation值（optional），只需要对信号值计算基线
        this.selectedFile.baselines = this.analysisService.calculateBaseLine([this.selectedFile.signals[0], this.selectedFile.signals[1]], 400)
        this.peakThres = "50"
        this.selectedFile.peaks = this.analysisService.findPeak([this.selectedFile.signals[0], this.selectedFile.signals[1]], this.selectedFile.baselines,
            Number(this.peakThres))
        this.plot(this.selectedFile, false)
    }

    visualizeUnderGoingTestData(content: string) {
        try {
            this.selectedFile.signals = this.analysisService.parseRawFile(content)
            this.plot(this.selectedFile, true);
        } catch (error) {
            console.log(content)
            console.log(error)
        }
    }

    RawFileChange(event): void {
        this.selectedFile = event.value
        if (this.selectedFile.fileName == "Real Time Plot") {
            this.getRealTimeData()
        } else {
            this.loadAndVisualizeFile(this.selectedFile.filePath)
            clearTimeout(this.syncFileJob)
        }
    }

    reCalculate(): void {
        if(this.selectedFile.filePath != "" && this.peakThres != "") {
            this.selectedFile.peaks = this.analysisService.findPeak([this.selectedFile.signals[0], this.selectedFile.signals[1]], this.selectedFile.baselines, Number(this.peakThres))
            this.plot(this.selectedFile, false)
        }
    }

    private buildLegend(numOfDimension: number, rawDataOnly: Boolean): any {
       console.log(numOfDimension / 2)
       let legend: any = {}
       legend.textStyle = { fontSize:20,fontWeight:100}
       legend.data = []
       for (let i = 0; i < Math.floor(numOfDimension / 2); i++) {
            legend.data.push('Raw Data' + (i + 1))
            legend.data.push('Temperature' + (i + 1))
            if (!rawDataOnly) legend.data.push('Baseline' + (i + 1))
       }
       return legend
    }

    private buildXAxis(time: number[]) : any {
       let xAxis = {type: 'category',data: time,name: 'Retention Time(s)',nameLocation:'middle',
            nameTextStyle: {
                fontSize: 25,
                color: "black",
                padding:20
            },
            axisLabel: {
                formatter: function(value, index) {
                    return Number(value).toFixed(2).toString()
                },
                fontSize:20,
                color: "black"
            }
        }
        return xAxis
    }

    private buildYAxis() : any {
       let yAxis = [{ 
                type: 'value',
                name: 'Intensity(mV)',
                nameTextStyle: {
                    fontSize: 25,
                    color: "black"
                },
                axisLabel: {
                    fontSize:20,
                    color:"black"
                }
            },
            { 
                type: 'value',
                name: 'Temperature',
                nameTextStyle: {
                    fontSize: 25,
                    color: "black"
                },
                axisLabel: {
                    fontSize:20,
                    color:"black"
                }
            }]
        return yAxis
    }

    private buildSeries(signals: Point[][], baselines: Point[][], peaks: Peak[][], rawDataOnly: Boolean) : any {
        let series = []
        
        // i: 0, 1 是一维二维信号，2,3是一维二维温度
        for (let i = 0; i < signals.length; i++) {
            let signalValue = []
            for (let j = 0; j < signals[i].length; j++) signalValue.push(signals[i][j].y)

            // 一维 二维 信号值
            if (i <= 1) {
                if (rawDataOnly) {
                    // plot signal only
                    let signal = {symbol: "none",name: "Raw Data" + (i + 1), data: signalValue, type: 'line', yAxisIndex: 0}
                    series.push(signal)
                } else {
                    // plot signal, baseline and peak
                    let signal = {symbol: "none",name: "Raw Data" + (i + 1), data: signalValue,
                                type: 'line', markPoint: {symbol:"number",symbolSize: 0,data: this.findMarkPoint(signals[i], peaks[i]),
                                    itemStyle: {
                                        color: 'black',
                                    }
                                },
                                yAxisIndex: 0
                            }
                    
                    let baselineValue = []
                    for (let j = 0; j < baselines[i].length; j++) baselineValue.push(baselines[i][j].y)
        
                    let baseline = {symbol: "none", name: "Baseline" + (i + 1), data: baselineValue,
                        type: 'line',
                    }
                    series.push(signal)
                    series.push(baseline)
                }
            } else if (i <= 3) {
                // 一维二维温度 Temperature1 Temperature2
                let signal = {symbol: "none",name: "Temperature" + (i - 1), data: signalValue, type: 'line', yAxisIndex: 1}
                series.push(signal)
            } else if (i == 4) {
                console.log("i am here" + signalValue)
                // plot modulation
                let signal = {symbol: "none",name: "", data: signalValue, type: 'line'}
                series.push(signal)
            }
           
        }

        return series
    }

    private plot(rawFile: RawFile, rawDataOnly: Boolean) {
        if (!rawDataOnly) {
            let resultTableStyle = document.getElementById("resultTable").style
            if (resultTableStyle.visibility == "hidden") {
                resultTableStyle.visibility = "visible"
            }
        }
       
        let time: number[] = []
        if (rawFile.signals.length != 0) {
            rawFile.signals[0].forEach(point => {
                time.push(point.x)
            })
        }

        this.chartOption = {
            legend: this.buildLegend(rawFile.signals.length, rawDataOnly),
            xAxis: this.buildXAxis(time),
            yAxis: this.buildYAxis(),
            series: this.buildSeries(rawFile.signals, rawFile.baselines, rawFile.peaks, rawDataOnly),
        }
    }

    findMarkPoint(signal: Point[], peaks: Peak[]): any[] {
        let markPoint = []
        peaks.forEach(peak => { 
            markPoint.push({xAxis: signal[peak.peakIndex].x.toString(), yAxis: signal[peak.peakIndex].y, value: peak.id})
        })
        return markPoint
    }

    saveResultClick(): void {
        let msg = "Save Successfully"
        try {
            let [cleanSignalFilePath, cleanSignalFileContent] = this.generateCleanSignalFile();
            this.electronService.saveTextFile(cleanSignalFilePath, cleanSignalFileContent)
    
            let [peakListFilePath, peakListFileContent] = this.generatePeakListFile();
            this.electronService.saveTextFile(peakListFilePath, peakListFileContent)
    
            let [peakFullInfoFilePath, peakFullInfoFileContent] = this.generatePeakFullInfoFile()
            this.electronService.saveTextFile(peakFullInfoFilePath, peakFullInfoFileContent)
        } catch (err) {
            msg = "Failed to save result";
        } finally {
           this.openDialog(msg);
        }
    }

    generateCleanSignalFile(): string[] {
        let times: number[][] = []
        let cleanSignals: number[][] = []
        let content = ''
        let path = this.selectedFile.filePath.replace("Raw", "Processed")

        for (let i = 0; i < this.selectedFile.signals.length; i++) {
            let signal = this.selectedFile.signals[i]
            let baseline = this.selectedFile.baselines[i]
            let time = []
            let cleanSignal = []

            for (let j = 0; j < signal.length; j++) {
                time.push(Number(signal[j].x * 1000).toFixed(5))
                cleanSignal.push(Number((signal[j].y - baseline[j].y).toFixed(5)))
            }
            times.push(time)
            cleanSignals.push(cleanSignal)
        }

        for (let i = 0; i < times.length; i++) {
            for (let j = 0; j < times[i].length; j++) {
                content += times[i][j] + "," + cleanSignals[i][j] + "\n"
            }
            if (i != times.length - 1) content += "!\n"
            else if (i == times.length - 1) content += "?\n"
        }

        return [path,content]
    }

    generatePeakListFile(): string[] {
        
        let content = ''
        let path = this.selectedFile.filePath.replace("RawChrom", "PeakList")
        
        let peakTime = []
        let peakHeight = []

        for(var i = 0; i < this.selectedFile.peaks.length; i++) {
            let peaks = this.selectedFile.peaks[i]
            for (let j = 0; j < peaks.length; j++) {
                peakHeight.push(peaks[j].height)
                peakTime.push(peaks[j].rt)
            }
        }

        for (let i = 0; i < peakTime.length; i++) {
            let row = peakTime[i] + "," + peakHeight[i] + "\n"
            content += row
        }

        return [path, content]
    }

    generatePeakFullInfoFile(): string[] {
        let content = ''
        let path = this.selectedFile.filePath.replace("RawChrom", "PeakFullInfo")
        let startTimes = []
        let peakTimes = []
        let endTimes = []
        let peakHeights = []
        let peakAreas = []

        for(var i = 0; i < this.selectedFile.peaks.length; i++) {
            let peaks = this.selectedFile.peaks[i]
            for (let j = 0; j < peaks.length; j++) {
                let peakStartIndex = peaks[j].startIndex
                let peakIndex = peaks[j].peakIndex
                let peakEndIndex = peaks[j].endIndex

                let peakStartTime = this.selectedFile.signals[i][peakStartIndex].x
                let peakTime = this.selectedFile.signals[i][peakIndex].x
                let peakEndTime = this.selectedFile.signals[i][peakEndIndex].x
                let peakHeight = peaks[j].height
                let peakArea = peaks[j].area

                startTimes.push(peakStartTime)
                peakTimes.push(peakTime)
                endTimes.push(peakEndTime)
                peakHeights.push(peakHeight)
                peakAreas.push(peakArea)
            }
        }

        for (let i = 0; i < peakTimes.length; i++) {
            let row = Number(startTimes[i]).toFixed(5) + "," + Number(peakTimes[i]).toFixed(5) + "," + Number(endTimes[i]).toFixed(5) + "," + Number(peakHeights[i]).toFixed(5) + "," + Number(peakAreas[i]).toFixed(5) + "\n"
            content += row
        }
         
        return [path, content]
    }

    openDialog(msg): void {
        let dialogConfig = new MatDialogConfig()
        dialogConfig.data = {
            msg:msg
        }

        this.dialog.open(DialogPageComponent, dialogConfig);
    }
}

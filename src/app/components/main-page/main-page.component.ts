import { Component, OnInit } from '@angular/core';
import { HttpService } from '../../services/http/http.service'
import { ElectronService } from '../../services/electron/electron.service'
import { FormControl, FormGroup } from '@angular/forms';
import { constants } from '../../constants/constants';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { DialogPageComponent } from '../dialog-page/dialog-page.component';

@Component({
  selector: 'app-main-page',
  templateUrl: './main-page.component.html',
  styleUrls: ['./main-page.component.scss']
})
export class MainPageComponent implements OnInit {
    
    public NonComprehensiveParametersForm: FormGroup;
    public ComprehensiveParametersForm: FormGroup;
    public communicationProtocol = constants.HTTP
    public connectionStatus = constants.CONNECT_STATUS_CONNECTING;
    public notConnected = true;
    private PING_INTERVAL_IN_MILLI_SECONDS = 5000;
    public GCTypes: string[] = [constants.COMPREHENSIVE, constants.NON_COMPREHENSIVE]
    public selectedGCType;
    private interval_ping_job;

    public Purposes: string[] = [constants.MULTIGRAP, constants.CONTINOUSTEST]
    public selectedPurpose;
    public Software: string[] = [constants.NOVASOFT_V1, constants.NOVASOFT_V2]
    public selectedSoftware;
    public Devices: string[];
    public selectedDevice;
    public Methods: string[];
    public selectedMethod;
    public MultiGraphFiles: string[];
    public selectedMultiGraphFile;
    public ContinousFiles: string[];
    public selectedContinousFile;

    constructor(private electronService: ElectronService, private httpService: HttpService, public dialog: MatDialog) {
         this.NonComprehensiveParametersForm = this.initNonComprehensiveParamFrom();
         this.ComprehensiveParametersForm = this.initComprehensiveParamForm()
    }
 
    ngOnInit(): void {
       this.interval_ping_job = setInterval(function() {
            this.httpService.ping().then(value => {
                if (value) {
                    this.connectionStatus = constants.CONNECT_STATUS_CONNECTED;
                    this.notConnected = false;
                }
                else {
                    this.connectionStatus = constants.CONNECT_STATUS_CONNECTING;
                    this.notConnected = true;
                    //this.notConnected = false;
                }
            }).catch(err => {
                console.log(err)
            })
            }.bind(this), this.PING_INTERVAL_IN_MILLI_SECONDS)
    }

    protocolChange($event) {
        console.log($event.value)
    }

    public GCTypeChange($event) {
        this.selectedGCType = $event.value
        if (this.selectedGCType == constants.NON_COMPREHENSIVE) {
            document.getElementById("NonComprehensiveForm").style.display = "block";
            document.getElementById("ComprehensiveForm").style.display = "none";
        } else {
            document.getElementById("NonComprehensiveForm").style.display = "none"
            document.getElementById("ComprehensiveForm").style.display = "block";
        }
        document.getElementById("Submission").style.display = "block";
    }

    public async updateClick(): Promise<void> {
        let msg: string = "";
        try {
            let isSucceed: Boolean = true;
            msg = this.validateParam(this.selectedGCType)
    
            if (msg == ""){ 
                let paramStr = this.getParamFormValueStr(this.selectedGCType);
                isSucceed = await this.httpService.updateParam(paramStr, this.selectedGCType);
            }
    
            if (!isSucceed) {
                msg = "Failed to submit";
            }
        } catch (err) {
            console.log(err)
            msg = "Connection issue, please try again";
        } finally {
            if (msg == "") msg = "Update Successfully"
            this.openDialog(msg);
        }
    }

    public runClick(): void {
        if (this.selectedGCType == constants.COMPREHENSIVE) {
            let testMode = this.ComprehensiveParametersForm.controls['ComprehensiveTestMode'].value
            if (testMode == '1') {
                this.startRun();
            } else {
                let count = this.ComprehensiveParametersForm.controls['ComprehensiveRunCount'].value
                let intervalInMin = this.ComprehensiveParametersForm.controls['ComprehensiveRunInterval'].value
                let res = this.ValidateRunCountAndInterval(count, intervalInMin)
                if (res != "") this.openDialog(res)
                else {
                    this.startRun()
                    count = parseFloat(count)
                    let intervalInMilli_Second = parseFloat(intervalInMin) * 60 * 1000
                    for (let i = 1; i < count; i++) {
                        setTimeout(this.startRun.bind(this), i * intervalInMilli_Second)
                    }
                }

            }
        } else {
            let testMode = this.NonComprehensiveParametersForm.controls['NonComprehensiveTestMode'].value
            if (testMode == '1') {
                this.startRun();
            } else {
                let count = this.NonComprehensiveParametersForm.controls['NonComprehensiveRunCount'].value
                let intervalInMin = this.NonComprehensiveParametersForm.controls['NonComprehensiveRunInterval'].value
                let res = this.ValidateRunCountAndInterval(count, intervalInMin  )
                if (res != "") this.openDialog(res)
                else {
                    this.startRun()
                    count = parseFloat(count)
                    let intervalInMilli_Second = parseFloat(intervalInMin) * 60 * 1000
                    for (let i = 1; i < count; i++) {
                        setTimeout(this.startRun.bind(this), i * intervalInMilli_Second)
                    }
                }

            }
        }
    }

    private async startRun():  Promise<void> {
        console.log("i am called")
        let msg: string = "";
        try {
            let isSucceed = await this.httpService.startTest(this.selectedGCType);
            
            if (!isSucceed) {
                msg = "Failed to submit";
            }                                        
        } catch (err) {
            console.log(err)
            msg = "Connection issue, please try again";
        } finally {
            if (msg == "") msg = "Run Successfully"
           this.openDialog(msg);
        }
    }

    async stopTestClick(): Promise<void> {
        let msg: string = "";
        try {
          let isSucceed = await this.httpService.stopTest();
          if (!isSucceed) msg = "Failed to stop"
        } catch (err) {
            msg = "Connection issue, please try again"
        } finally {
            if (msg == "") msg = "Stop Successfully"
            this.openDialog(msg)
        }
    }

    async saveParamClick(): Promise<void> {
        let msg : string = ""
        try {
            msg = this.validateParam(this.selectedGCType)
            if (msg == "") {
                let paramStr = this.convertParamToJSONString(this.selectedGCType);
                let fileName = this.selectedGCType == constants.COMPREHENSIVE ? constants.COMPREHENSIVE_PARAM_FILE_PATH : constants.NON_COMPREHENSIVE_PARAM_FILE_PATH
                this.electronService.saveTextFile(fileName, paramStr);
            }
        } catch (err) {
            console.log(err)
            msg = "Failed to save parameter";
        } finally {
            if (msg == "") msg = "Save parameter successfully";
            this.openDialog(msg);
        }
    }

    async syncFileClick(): Promise<void> {
        let msg: string = "Sync files successfully";
        try {
            await this.syncFile();
        } catch(err) {
           msg = "Failed to sync files";
        } finally {
           this.openDialog(msg);
        } 
    }

    async syncFile(): Promise<void> {
        let unSyncedFiles = []
        let remoteFiles = await this.httpService.listFiles();
        let localFiles =  this.electronService.loadFileFromNovaDocBaseDir();
        for (let i = 0; i < remoteFiles.length; i++) {
            if (!this.electronService.checkExists(localFiles, remoteFiles[i])) {
                unSyncedFiles.push(remoteFiles[i])
            }
        }
        if (unSyncedFiles.length != 0) {
            for (let i = 0; i < unSyncedFiles.length; i++) {
                let file = unSyncedFiles[i];
                let blob = await this.httpService.downloadFile(file)
                await this.electronService.saveFile(file, blob);
            }
        }
    }

    // convert form to json string
    private convertParamToJSONString(GCType: string): string {
        let paramStr = GCType == constants.NON_COMPREHENSIVE? JSON.stringify(this.NonComprehensiveParametersForm.getRawValue()) : JSON.stringify(this.ComprehensiveParametersForm.getRawValue())
        return paramStr;
    }
    
    // convert from values to string
    private getParamFormValueStr(GCType: string): string {
        let obj: Object = GCType == constants.NON_COMPREHENSIVE? this.NonComprehensiveParametersForm.getRawValue() : this.ComprehensiveParametersForm.getRawValue();
        let valueArray = Object.values(obj);
        return valueArray.join() + ",\n"
    }

    // read txt file and initialize form
    private getCachedForm(GCType: string): FormGroup {
        let filePath = GCType == constants.NON_COMPREHENSIVE? constants.NON_COMPREHENSIVE_PARAM_FILE_PATH : constants.COMPREHENSIVE_PARAM_FILE_PATH
        let paramStr = this.electronService.readTextFile(filePath);
        let obj: Object = JSON.parse(paramStr);
        let form = new FormGroup({})
        for (let [key, value] of Object.entries(obj)) {
            form.addControl(key, new FormControl(value))
        }
        return form
    }
   
    private initNonComprehensiveParamFrom(): FormGroup {
        let form: FormGroup;
        if (this.electronService.checkFileExists(constants.NON_COMPREHENSIVE_PARAM_FILE_PATH)) { 
            form = this.getCachedForm(constants.NON_COMPREHENSIVE)
        } else {
            form = new FormGroup({

                // basic setting
                NonComprehensiveStartTime: new FormControl(''), // 1
                
                NonComprehensiveWaitingTime: new FormControl(''), // 2
                NonComprehensiveSamplingMode: new FormControl(''), // 3
                NonComprehensiveSamplingTime: new FormControl(''), // 4
                NonComprehensiveSamplingPercent: new FormControl(''), //5

                NonComprehensiveCleaningTime1: new FormControl(''), // 6
                NonComprehensiveCleaningPWM1: new FormControl(''), // 7
                NonComprehensiveCleaningTime2: new FormControl(''), // 8
                NonComprehensiveCleaningPWM2: new FormControl(''), // 9
                NonComprehensiveCleaningTime3: new FormControl(''), // 10
                NonComprehensiveCleaningPWM3: new FormControl('0'), // 11

                // 1D setting precon
                NonComprehensiveFirstDimensionPreconInjectionTime1: new FormControl(''), // 12
                NonComprehensiveFirstDimensionPreconInjectionPWM1: new FormControl(''), // 13
                NonComprehensiveFirstDimensionPreconInjectionTime2: new FormControl( ''), // 14
                NonComprehensiveFirstDimensionPreconInjectionPWM2: new FormControl(''), // 15
        
                // 1D setting column
                NonComprehensiveFirstDimensionColumnTime1: new FormControl(''), // 16
                NonComprehensiveFirstDimensionColumnPWM1: new FormControl(''), // 17
                NonComprehensiveFirstDimensionColumnTime2: new FormControl(''), // 18
                NonComprehensiveFirstDimensionColumnPWM2: new FormControl(''), // 19
                NonComprehensiveFirstDimensionColumnTime3: new FormControl(''), // 20
                NonComprehensiveFirstDimensionColumnPWM3: new FormControl(''), // 21
                NonComprehensiveFirstDimensionColumnTime4: new FormControl(''), // 22
                NonComprehensiveFirstDimensionColumnPWM4: new FormControl(''), // 23
        
                // 1D HC Time Setting
                NonComprehensiveFirstDimensionHCStartTime: new FormControl('0'), // 24
                NonComprehensiveFirstDimensionHCEndTime: new FormControl(''), // 25

                // 1D setting pump
                NonComprehensiveFirstDimensionPumpHC1: new FormControl(''), // 26
                NonComprehensiveFirstDimensionPumpHC2: new FormControl(''), // 27
        
                // 2D Waiting Time
                NonComprehensiveSecondDimensionWaitingTime: new FormControl(''), // 28

                //2D setting Ti
                NonComprehensiveSecondDimensionTiInjectionTime1: new FormControl(''), // 29
                NonComprehensiveSecondDimensionTiInjectionPWM1: new FormControl(''), // 30
                NonComprehensiveSecondDimensionTiInjectionTime2: new FormControl(''), // 31
                NonComprehensiveSecondDimensionTiInjectionPWM2: new FormControl(''), // 32
        
                //2D setting column
                NonComprehensiveSecondDimensionColumnTime1: new FormControl(''), // 33
                NonComprehensiveSecondDimensionColumnPWM1: new FormControl(''), // 34
                NonComprehensiveSecondDimensionColumnTime2: new FormControl(''), // 35
                NonComprehensiveSecondDimensionColumnPWM2: new FormControl(''), // 36
                NonComprehensiveSecondDimensionColumnTime3: new FormControl(''), // 37
                NonComprehensiveSecondDimensionColumnPWM3: new FormControl(''), // 38
                NonComprehensiveSecondDimensionColumnTime4: new FormControl(''), // 39
                NonComprehensiveSecondDimensionColumnPWM4: new FormControl(''), // 40

                //real time
                NonComprehensiveDataMode: new FormControl('1'), // 41 default real time

                NonComprehensiveTestMode: new FormControl('0'), // 42
                NonComprehensiveRunCount: new FormControl(''), // 43
                NonComprehensiveRunInterval: new FormControl(''), //44

                NonComprehensiveReferenceValveOpenTime: new FormControl(''), // 45

                NonComprehensiveTICleaningMode: new FormControl(''), // 46
                NonComprehensiveTICleanWaitTime: new FormControl('') // 47

            })
        }

        return form;
    }

    private initComprehensiveParamForm(): FormGroup {
        let form: FormGroup;
        if (this.electronService.checkFileExists(constants.COMPREHENSIVE_PARAM_FILE_PATH)) { 
            form = this.getCachedForm(constants.COMPREHENSIVE)
        } else {
            form = new FormGroup({

                // basic setting
                ComprehensiveStartTime: new FormControl(''), // 1
                
                ComprehensiveWaitingTime: new FormControl(''), // 2

                ComprehensiveSamplingRate: new FormControl(''), // 3

                ComprehensiveSamplingMode: new FormControl(''), // 4
                ComprehensiveSamplingTime: new FormControl(''), // 5
                ComprehensiveSamplingPercent: new FormControl(''), // 6

                ComprehensiveCleaningTime1: new FormControl(''), // 7
                ComprehensiveCleaningPWM1: new FormControl(''), // 8
                ComprehensiveCleaningTime2: new FormControl(''), // 9
                ComprehensiveCleaningPWM2: new FormControl(''), // 10
                ComprehensiveCleaningTime3: new FormControl(''), // 11
                ComprehensiveCleaningPWM3: new FormControl('0'), // 12

                // 1D setting precon
                ComprehensiveFirstDimensionPreconInjectionTime1: new FormControl(''), // 13
                ComprehensiveFirstDimensionPreconInjectionPWM1: new FormControl(''), // 14
                ComprehensiveFirstDimensionPreconInjectionTime2: new FormControl( ''), // 15
                ComprehensiveFirstDimensionPreconInjectionPWM2: new FormControl(''), // 16
        
                // 1D setting column
                ComprehensiveFirstDimensionColumnTime1: new FormControl(''), // 17
                ComprehensiveFirstDimensionColumnPWM1: new FormControl(''), // 18
                ComprehensiveFirstDimensionColumnTime2: new FormControl(''), // 19
                ComprehensiveFirstDimensionColumnPWM2: new FormControl(''), // 20
                ComprehensiveFirstDimensionColumnTime3: new FormControl(''), // 21
                ComprehensiveFirstDimensionColumnPWM3: new FormControl(''), // 22
                ComprehensiveFirstDimensionColumnTime4: new FormControl(''), // 23
                ComprehensiveFirstDimensionColumnPWM4: new FormControl(''), // 24
                ComprehensiveFirstDimensionColumnTime5: new FormControl(''), // 25
                ComprehensiveFirstDimensionColumnPWM5: new FormControl(''), // 26
        
                // 1D setting pump
                ComprehensiveFirstDimensionPump: new FormControl(''), // 27
        
                // 1D Clean
                ComprehensiveFirstDimensionPIDCleanTime: new FormControl(''), // 28
                ComprehensiveFirstDimensionPIDCleanPWM: new FormControl(''), //29

                //2D modulation setting
                ComprehensiveSecondDimensionModulation1Time: new FormControl(''), // 30
                ComprehensiveSecondDimensionModulation1ModulationTime: new FormControl(''), // 31
                ComprehensiveSecondDimensionModulation1LoadingTime: new FormControl(''), // 32

                ComprehensiveSecondDimensionModulation2Time: new FormControl(''), // 33
                ComprehensiveSecondDimensionModulation2ModulationTime: new FormControl(''), // 34
                ComprehensiveSecondDimensionModulation2LoadingTime: new FormControl(''), // 35

                ComprehensiveSecondDimensionModulation3Time: new FormControl(''), // 36
                ComprehensiveSecondDimensionModulation3ModulationTime: new FormControl(''), // 37
                ComprehensiveSecondDimensionModulation3LoadingTime: new FormControl(''), // 38

                ComprehensiveSecondDimensionModulation4Time: new FormControl(''), // 39
                ComprehensiveSecondDimensionModulation4ModulationTime: new FormControl(''), // 40
                ComprehensiveSecondDimensionModulation4LoadingTime: new FormControl(''), // 41


                //2D column setting
                ComprehensiveSecondDimensionColumnTime1: new FormControl(''), // 42
                ComprehensiveSecondDimensionColumnPWM1: new FormControl(''), // 43
                ComprehensiveSecondDimensionColumnTime2: new FormControl(''), // 44
                ComprehensiveSecondDimensionColumnPWM2: new FormControl(''), // 45
                ComprehensiveSecondDimensionColumnTime3: new FormControl(''), // 46
                ComprehensiveSecondDimensionColumnPWM3: new FormControl(''), // 47
                ComprehensiveSecondDimensionColumnTime4: new FormControl(''), // 48
                ComprehensiveSecondDimensionColumnPWM4: new FormControl(''), // 49
                ComprehensiveSecondDimensionColumnTime5: new FormControl(''), // 50
                ComprehensiveSecondDimensionColumnPWM5: new FormControl(''), // 51

                // 2D pump
                ComprehensiveSecondDimensionPump: new FormControl(''), // 52

                ComprehensiveSecondDimensionPIDCleanTime: new FormControl(''), // 53

                ComprehensiveSecondDimensionPIDCleanPWM: new FormControl(''), // 54
                
                //real time
                ComprehensiveDataMode: new FormControl('1'), // 55 default real time

                // test mode
                ComprehensiveTestMode: new FormControl('0'), // 56

                ComprehensiveRunCount: new FormControl(''), // 57
                ComprehensiveRunInterval: new FormControl(''), // 58

                ComprehensiveReferenceValveOpenTime: new FormControl(''), // 59

                ComprehensiveTICleaningMode: new FormControl(''), // 60
                ComprehensiveTICleanWaitTime: new FormControl('') // 61
            })
        }

        return form;
    }

    private validateNonComprehensiveParam(): string {
        let controls = this.NonComprehensiveParametersForm.controls

        let testMode = controls['NonComprehensiveTestMode'].value
        let startTime = controls['NonComprehensiveStartTime'].value
        let count = controls['NonComprehensiveRunCount'].value
        let interval = controls['NonComprehensiveRunInterval'].value

        if (testMode == '1') { 
           let res = this.validateStartTime(startTime)
           if (res != '') return res
        } else {
            let res = this.ValidateRunCountAndInterval(count, interval)
            if (res != '') return res
        }

        let waittingTime = controls['NonComprehensiveWaitingTime'].value
        if (waittingTime == '' || isNaN(waittingTime) || parseFloat(waittingTime) < 0) return "waiting time should be positive number"

        let samplingMode = controls['NonComprehensiveSamplingMode'].value
        if (samplingMode != '0' && samplingMode != '1') return "sampling mode not selected"

        let samplingTime = controls['NonComprehensiveSamplingTime'].value
        let samplingPercent = controls['NonComprehensiveSamplingPercent'].value

        if (samplingMode == '0') {
            if (samplingTime == '' || isNaN(samplingTime) || parseFloat(samplingTime) < 0) return "sampling time should be positive number"
        } else if (samplingMode == '1') {
            if (samplingPercent == '' || isNaN(samplingPercent) || parseFloat(samplingPercent) < 5 || parseFloat(samplingPercent) > 100) return "sampling percent should be between 3 and 100"
        }

        let cleaningPWM2 = controls['NonComprehensiveCleaningPWM2'].value
        if (cleaningPWM2 == '' || isNaN(cleaningPWM2) || parseFloat(cleaningPWM2) < 0 || parseFloat(cleaningPWM2) > 100) return "Humidity filter cleaning pwm invalid"

        let cleaningTime3 = controls['NonComprehensiveCleaningTime3'].value
        if (cleaningTime3 == '' || isNaN(cleaningTime3) || parseFloat(cleaningTime3) < 0) return "Humidity filter cleaning time invalid"


        // 1D Precon Checking
        let FirstDimensionPreconInjectionPWM1 = controls['NonComprehensiveFirstDimensionPreconInjectionPWM1'].value
        if (FirstDimensionPreconInjectionPWM1 == '' || isNaN(FirstDimensionPreconInjectionPWM1) || parseFloat(FirstDimensionPreconInjectionPWM1) < 0 || parseFloat(FirstDimensionPreconInjectionPWM1) > 100) return "1D precon injection PWM should be between 0 and 100"
       
        let FirstDimensionPreconInjectionPWM2 = controls['NonComprehensiveFirstDimensionPreconInjectionPWM2'].value
        if (FirstDimensionPreconInjectionPWM2 == '' || isNaN(FirstDimensionPreconInjectionPWM2) || parseFloat(FirstDimensionPreconInjectionPWM2) < 0 || parseFloat(FirstDimensionPreconInjectionPWM2) > 100) return "1D precon injection PWM should be between 0 and 100"
        
        let FirstDimensionPreconInjectionTime1 = controls["NonComprehensiveFirstDimensionPreconInjectionTime1"].value
        if (FirstDimensionPreconInjectionTime1 == '' || isNaN(FirstDimensionPreconInjectionTime1) || parseFloat(FirstDimensionPreconInjectionTime1) < 0.6 || parseFloat(FirstDimensionPreconInjectionTime1) > 1.2) return "1D precon injection time should be between 0.6 and 1.2"
         
        let FirstDimensionPreconInjectionTime2 = controls['NonComprehensiveFirstDimensionPreconInjectionTime2'].value
        if (FirstDimensionPreconInjectionTime2 == '' || isNaN(FirstDimensionPreconInjectionTime2) || parseFloat(FirstDimensionPreconInjectionTime2) < 4 || parseFloat(FirstDimensionPreconInjectionTime2) > 12) return "1D precon injection time should be between 4 and 12"
        
         // 1D Column Checking
        let FirstDimensionColumnTime1 = controls['NonComprehensiveFirstDimensionColumnTime1'].value
        if (FirstDimensionColumnTime1 == '' || isNaN(FirstDimensionColumnTime1) || parseFloat(FirstDimensionColumnTime1) < 0) return "1D column time should be positive number"

        let FirstDimensionColumnPWM1 = controls['NonComprehensiveFirstDimensionColumnPWM1'].value
        if (FirstDimensionColumnPWM1 == '' || isNaN(FirstDimensionColumnPWM1) || parseFloat(FirstDimensionColumnPWM1) < 0 || parseFloat(FirstDimensionColumnPWM1) > 100) return "1D column PWN should be between 0 and 100"

        let FirstDimensionColumnTime2 = controls['NonComprehensiveFirstDimensionColumnTime2'].value
        if (FirstDimensionColumnTime2 == '' || isNaN(FirstDimensionColumnTime2) || parseFloat(FirstDimensionColumnTime2) < 0) return "1D column time should be positive number"

        let FirstDimensionColumnPWM2 = controls['NonComprehensiveFirstDimensionColumnPWM2'].value
        if (FirstDimensionColumnPWM2 == '' || isNaN(FirstDimensionColumnPWM2) || parseFloat(FirstDimensionColumnPWM2) < 0 ||  parseFloat(FirstDimensionColumnPWM2) > 100) return "1D column PWN should be between 0 and 100"

        let FirstDimensionColumnTime3 = controls['NonComprehensiveFirstDimensionColumnTime3'].value
        if (FirstDimensionColumnTime3 == '' || isNaN(FirstDimensionColumnTime3) || parseFloat(FirstDimensionColumnTime3) < 0) return "1D column time should be positive number"

        let FirstDimensionColumnPWM3 = controls['NonComprehensiveFirstDimensionColumnPWM3'].value
        if (FirstDimensionColumnPWM3 == '' || isNaN(FirstDimensionColumnPWM3) || parseFloat(FirstDimensionColumnPWM3) < 0 || parseFloat(FirstDimensionColumnPWM3) > 100) return "1D column PWN should be between 0 and 100"

        let FirstDimensionColumnTime4 = controls['NonComprehensiveFirstDimensionColumnTime4'].value
        if (FirstDimensionColumnTime4 == '' || isNaN(FirstDimensionColumnTime4) || parseFloat(FirstDimensionColumnTime4) < 0) return "1D column time should be positive number"

        let FirstDimensionColumnPWM4 = controls['NonComprehensiveFirstDimensionColumnPWM4'].value
        if (FirstDimensionColumnPWM4 == '' || isNaN(FirstDimensionColumnPWM4) || parseFloat(FirstDimensionColumnPWM4) < 0 || parseFloat(FirstDimensionColumnPWM4) > 100) return "1D column PWM should be between 0 and 100"

        // 1D HC Checking
        let FirstDimensionHCEndTime = controls['NonComprehensiveFirstDimensionHCEndTime'].value
        if (FirstDimensionHCEndTime == '' || isNaN(FirstDimensionHCEndTime) || parseFloat(FirstDimensionHCEndTime) < 0) return "Heart Cut end time should be positive number"

        let time1 = parseFloat(FirstDimensionColumnTime1)
        let time2 = parseFloat(FirstDimensionColumnTime2)
        let time3 = parseFloat(FirstDimensionColumnTime3)
        let time4 = parseFloat(FirstDimensionHCEndTime)
        if (time4 > time1 + time2 + time3) return "Heart cut time to long"
        
        // 1D Pump Setting
        let FirstDimensionPumpHC1 = controls['NonComprehensiveFirstDimensionPumpHC1'].value
        if (FirstDimensionPumpHC1 == '' || isNaN(FirstDimensionPumpHC1) || parseFloat(FirstDimensionPumpHC1) < 0) return "Heart Cut voltage should be positive number"

        let FirstDimensionPumpHC2 = controls['NonComprehensiveFirstDimensionPumpHC2'].value
        if (FirstDimensionPumpHC2 == '' || isNaN(FirstDimensionPumpHC2) || parseFloat(FirstDimensionPumpHC2) < 0) return "Heart Cut voltage should be positive number"
      
        let SecondDimentionWaitTime = controls['NonComprehensiveSecondDimensionWaitingTime'].value
        if (SecondDimentionWaitTime == '' || isNaN(SecondDimentionWaitTime) || parseFloat(SecondDimentionWaitTime) < 0) return "2D wait time should be larger than 0"

        // 2D Inject Checking
        let SecondDimensionATiInjectionPWM1 = controls['NonComprehensiveSecondDimensionTiInjectionPWM1'].value
        if (SecondDimensionATiInjectionPWM1 == '' || isNaN(SecondDimensionATiInjectionPWM1) || parseFloat(SecondDimensionATiInjectionPWM1) < 0 || parseFloat(SecondDimensionATiInjectionPWM1) > 100) return "2DA injection PWM should be between 0 and 100"

        let SecondDimensionATiInjectionPWM2 = controls['NonComprehensiveSecondDimensionTiInjectionPWM2'].value
        if (SecondDimensionATiInjectionPWM2 == '' || isNaN(SecondDimensionATiInjectionPWM2) || parseFloat(SecondDimensionATiInjectionPWM2) < 0 || parseFloat(SecondDimensionATiInjectionPWM2) > 100) return "2DA injection PWM should be between 0 and 100"

        let SecondDimensionTiInjectionTime1 = controls["NonComprehensiveSecondDimensionTiInjectionTime1"].value
        if (SecondDimensionTiInjectionTime1 == '' || isNaN(SecondDimensionTiInjectionTime1) || parseFloat(SecondDimensionTiInjectionTime1) < 0.6 || parseFloat(SecondDimensionTiInjectionTime1) > 1.2) return "2D injection time should be between 0.6 and 1.2"
         
        let SecondDimensionTiInjectionTime2 = controls['NonComprehensiveSecondDimensionTiInjectionTime2'].value
        if (SecondDimensionTiInjectionTime2 == '' || isNaN(SecondDimensionTiInjectionTime2) || parseFloat(SecondDimensionTiInjectionTime2) < 4 || parseFloat(SecondDimensionTiInjectionTime2) > 12) return "2D injection time should be between 4 and 12"

        // 2D Column Checking
        let SecondDimensionAColumnTime1 = controls['NonComprehensiveSecondDimensionColumnTime1'].value
        if (SecondDimensionAColumnTime1 == '' || isNaN(SecondDimensionAColumnTime1) || parseFloat(SecondDimensionAColumnTime1) < 0) return "2D A column time should be positive number"

        let SecondDimensionAColumnPWM1 = controls['NonComprehensiveSecondDimensionColumnPWM1'].value
        if (SecondDimensionAColumnPWM1 == '' || isNaN(SecondDimensionAColumnPWM1) || parseFloat(SecondDimensionAColumnPWM1) < 0 || parseFloat(SecondDimensionAColumnPWM1) > 100) return "2D A column PWN should be between 0 and 100"

        let SecondDimensionAColumnTime2 = controls['NonComprehensiveSecondDimensionColumnTime2'].value
        if (SecondDimensionAColumnTime2 == '' || isNaN(SecondDimensionAColumnTime2) || parseFloat(SecondDimensionAColumnTime2) < 0) return "2D A column time should be positive number"

        let SecondDimensionAColumnPWM2 = controls['NonComprehensiveSecondDimensionColumnPWM2'].value
        if (SecondDimensionAColumnPWM2 == '' || isNaN(SecondDimensionAColumnPWM2) || parseFloat(SecondDimensionAColumnPWM2) < 0 || parseFloat(SecondDimensionAColumnPWM2) > 100) return "2D A column PWN should be between 0 and 100"

        let SecondDimensionAColumnTime3 = controls['NonComprehensiveSecondDimensionColumnTime3'].value
        if (SecondDimensionAColumnTime3 == '' || isNaN(SecondDimensionAColumnTime3) || parseFloat(SecondDimensionAColumnTime3) < 0) return "2D A column time should be positive number"

        let SecondDimensionAColumnPWM3 = controls['NonComprehensiveSecondDimensionColumnPWM3'].value
        if (SecondDimensionAColumnPWM3 == '' || isNaN(SecondDimensionAColumnPWM3) || parseFloat(SecondDimensionAColumnPWM3) < 0 || parseFloat(SecondDimensionAColumnPWM3) > 100) return "2D A column PWN should be between 0 and 100"

        let SecondDimensionAColumnTime4 = controls['NonComprehensiveSecondDimensionColumnTime4'].value
        if (SecondDimensionAColumnTime4 == '' || isNaN(SecondDimensionAColumnTime4) || parseFloat(SecondDimensionAColumnTime4) < 0) return "2D A column time should be positive number"

        let SecondDimensionAColumnPWM4 = controls['NonComprehensiveSecondDimensionColumnPWM4'].value
        if (SecondDimensionAColumnPWM4 == '' || isNaN(SecondDimensionAColumnPWM4) || parseFloat(SecondDimensionAColumnPWM4) < 0 || parseFloat(SecondDimensionAColumnPWM4) > 100) return "2D A column PWN should be between 0 and 100"

        return "";
    }

    private validateComprehensiveParam(): string {
        let controls = this.ComprehensiveParametersForm.controls

        let testMode = controls['ComprehensiveTestMode'].value
        let startTime = controls['ComprehensiveStartTime'].value
        let count = controls['ComprehensiveRunCount'].value
        let interval = controls['ComprehensiveRunInterval'].value

        if (testMode == '1') { 
           let res = this.validateStartTime(startTime)
           if (res != '') return res
        } else {
            if (count == '' || isNaN(count) || parseFloat(count) < 0) return "invalid count value"
            if (interval == '' || isNaN(interval) || parseFloat(interval) < 0) return "invalid interval value"
        }

        let waittingTime = controls['ComprehensiveWaitingTime'].value
        if (waittingTime == '' || isNaN(waittingTime) || parseFloat(waittingTime) < 0) return "waiting time should be positive number"

        let samplingRate = controls['ComprehensiveSamplingRate'].value
        if (samplingRate == '' || isNaN(samplingRate) || parseFloat(samplingRate) < 0 || parseFloat(samplingRate) > 100) return "sampling rate should between 0 and 100"

        let samplingMode = controls['ComprehensiveSamplingMode'].value
        if (samplingMode != '0' && samplingMode != '1') return "sampling mode is not selected"

        let samplingTime = controls['ComprehensiveSamplingTime'].value
        let samplingPercent = controls['ComprehensiveSamplingPercent'].value

        if (samplingMode == '0') {
            if (samplingTime == '' || isNaN(samplingTime) || parseFloat(samplingTime) < 0) return "sampling time should be positive number"
        } else if (samplingMode == '1') {
            if (samplingPercent == '' || isNaN(samplingPercent) || parseFloat(samplingPercent) < 5 || parseFloat(samplingPercent) > 100) return "sampling percent should be between 3 and 100"
        }
        
        let cleaningPWM2 = controls['ComprehensiveCleaningPWM2'].value
        if (cleaningPWM2 == '' || isNaN(cleaningPWM2) || parseFloat(cleaningPWM2) < 0 || parseFloat(cleaningPWM2) > 100) return "Humidity filter cleaning pwm invalid"

        let cleaningTime3 = controls['ComprehensiveCleaningTime3'].value
        if (cleaningTime3 == '' || isNaN(cleaningTime3) || parseFloat(cleaningTime3) < 0) return "Humidity filter cleaning time invalid"


        // 1D Precon Checking
        let FirstDimensionPreconInjectionTime1 = controls["ComprehensiveFirstDimensionPreconInjectionTime1"].value
        if (FirstDimensionPreconInjectionTime1 == '' || isNaN(FirstDimensionPreconInjectionTime1) || parseFloat(FirstDimensionPreconInjectionTime1) < 0.6 || parseFloat(FirstDimensionPreconInjectionTime1) > 1.2) return "1D precon injection time should be between 0.6 and 1.2"

        let FirstDimensionPreconInjectionPWM1 = controls['ComprehensiveFirstDimensionPreconInjectionPWM1'].value
        if (FirstDimensionPreconInjectionPWM1 == '' || isNaN(FirstDimensionPreconInjectionPWM1) || parseFloat(FirstDimensionPreconInjectionPWM1) < 0 || parseFloat(FirstDimensionPreconInjectionPWM1) > 100) return "1D precon injection PWM should be between 0 and 100"
        
        let FirstDimensionPreconInjectionTime2 = controls['ComprehensiveFirstDimensionPreconInjectionTime2'].value
        if (FirstDimensionPreconInjectionTime2 == '' || isNaN(FirstDimensionPreconInjectionTime2) || parseFloat(FirstDimensionPreconInjectionTime2) < 4 || parseFloat(FirstDimensionPreconInjectionTime2) > 12) return "1D precon injection time should be between 4 and 12"

        let FirstDimensionPreconInjectionPWM2 = controls['ComprehensiveFirstDimensionPreconInjectionPWM2'].value
        if (FirstDimensionPreconInjectionPWM2 == '' || isNaN(FirstDimensionPreconInjectionPWM2) || parseFloat(FirstDimensionPreconInjectionPWM2) < 0 || parseFloat(FirstDimensionPreconInjectionPWM2) > 100) return "1D precon injection PWM should be between 0 and 100"
        
        // 1D Column Checking
        let FirstDimensionColumnTime1 = controls['ComprehensiveFirstDimensionColumnTime1'].value
        if (FirstDimensionColumnTime1 == '' || isNaN(FirstDimensionColumnTime1) || parseFloat(FirstDimensionColumnTime1) < 0) return "1D column time should be positive number"

        let FirstDimensionColumnPWM1 = controls['ComprehensiveFirstDimensionColumnPWM1'].value
        if (FirstDimensionColumnPWM1 == '' || isNaN(FirstDimensionColumnPWM1) || parseFloat(FirstDimensionColumnPWM1) < 0 || parseFloat(FirstDimensionColumnPWM1) > 100) return "1D column PWN should be between 0 and 100"

        let FirstDimensionColumnTime2 = controls['ComprehensiveFirstDimensionColumnTime2'].value
        if (FirstDimensionColumnTime2 == '' || isNaN(FirstDimensionColumnTime2) || parseFloat(FirstDimensionColumnTime2) < 0) return "1D column time should be positive number"

        let FirstDimensionColumnPWM2 = controls['ComprehensiveFirstDimensionColumnPWM2'].value
        if (FirstDimensionColumnPWM2 == '' || isNaN(FirstDimensionColumnPWM2) || parseFloat(FirstDimensionColumnPWM2) < 0 ||  parseFloat(FirstDimensionColumnPWM2) > 100) return "1D column PWN should be between 0 and 100"

        let FirstDimensionColumnTime3 = controls['ComprehensiveFirstDimensionColumnTime3'].value
        if (FirstDimensionColumnTime3 == '' || isNaN(FirstDimensionColumnTime3) || parseFloat(FirstDimensionColumnTime3) < 0) return "1D column time should be positive number"

        let FirstDimensionColumnPWM3 = controls['ComprehensiveFirstDimensionColumnPWM3'].value
        if (FirstDimensionColumnPWM3 == '' || isNaN(FirstDimensionColumnPWM3) || parseFloat(FirstDimensionColumnPWM3) < 0 || parseFloat(FirstDimensionColumnPWM3) > 100) return "1D column PWN should be between 0 and 100"

        let FirstDimensionColumnTime4 = controls['ComprehensiveFirstDimensionColumnTime4'].value
        if (FirstDimensionColumnTime4 == '' || isNaN(FirstDimensionColumnTime4) || parseFloat(FirstDimensionColumnTime4) < 0) return "1D column time should be positive number"
        
        let FirstDimensionColumnPWM4 = controls['ComprehensiveFirstDimensionColumnPWM4'].value
        if (FirstDimensionColumnPWM4 == '' || isNaN(FirstDimensionColumnPWM4) || parseFloat(FirstDimensionColumnPWM4) < 0 || parseFloat(FirstDimensionColumnPWM4) > 100) return "1D column PWN should be between 0 and 100"
        
        // 1D Pump Setting
        let FirstDimensionPump = controls['ComprehensiveFirstDimensionPump'].value
        if (FirstDimensionPump == '' || isNaN(FirstDimensionPump) || parseFloat(FirstDimensionPump) < 0) return "1D pump voltage should be positive number"

        // 1D Cleaning Setting
        let FirstDimensionCleaningTime = controls['ComprehensiveFirstDimensionPIDCleanTime'].value
        if (FirstDimensionCleaningTime == '' || isNaN(FirstDimensionCleaningTime) || parseFloat(FirstDimensionCleaningTime) < 0) return "1D PID clean time show be larger than 0"

        let FirstDimensionCleaningPWM = controls['ComprehensiveFirstDimensionPIDCleanPWM'].value
        if (FirstDimensionCleaningPWM == '' || isNaN(FirstDimensionCleaningPWM) || parseFloat(FirstDimensionCleaningPWM) < 0 || parseFloat(FirstDimensionCleaningTime) > 100) return "1D PID clean pwm should be between 0 and 100"

        // 2D modulation Checking
        let SecondDimensionModulation1Time = controls['ComprehensiveSecondDimensionModulation1Time'].value
        if (SecondDimensionModulation1Time == '' || isNaN(SecondDimensionModulation1Time) || parseFloat(SecondDimensionModulation1Time) < 0) return "2D modulation time should be larger than 0"

        let SecondDimensionModulation1ModulationTime = controls['ComprehensiveSecondDimensionModulation1ModulationTime'].value
        if (SecondDimensionModulation1ModulationTime == '' || isNaN(SecondDimensionModulation1ModulationTime) || parseFloat(SecondDimensionModulation1ModulationTime) < 0) return "2D modulation time should be larger than 0"
        
        let SecondDimensionModulation1LoadingTime = controls['ComprehensiveSecondDimensionModulation1LoadingTime'].value
        if (SecondDimensionModulation1LoadingTime == '' || isNaN(SecondDimensionModulation1LoadingTime) || parseFloat(SecondDimensionModulation1LoadingTime) < 0) return "2D modulation loading time should be larger than 0"

        if (parseFloat(SecondDimensionModulation1ModulationTime) > parseFloat(SecondDimensionModulation1Time) ||parseFloat(SecondDimensionModulation1LoadingTime) > parseFloat(SecondDimensionModulation1ModulationTime)) return "modulation time invalid1"

        let SecondDimensionModulation2Time = controls['ComprehensiveSecondDimensionModulation2Time'].value
        if (SecondDimensionModulation2Time == '' || isNaN(SecondDimensionModulation2Time) || parseFloat(SecondDimensionModulation2Time) < 0) return "2D modulation time should be larger than 0"

        let SecondDimensionModulation2ModulationTime = controls['ComprehensiveSecondDimensionModulation2ModulationTime'].value
        if (SecondDimensionModulation2ModulationTime == '' || isNaN(SecondDimensionModulation2ModulationTime) || parseFloat(SecondDimensionModulation2ModulationTime) < 0) return "2D modulation time should be larger than 0"

        let SecondDimensionModulation2LoadingTime = controls['ComprehensiveSecondDimensionModulation2LoadingTime'].value
        if (SecondDimensionModulation2LoadingTime == '' || isNaN(SecondDimensionModulation2LoadingTime) || parseFloat(SecondDimensionModulation2LoadingTime) < 0) return "2D modulation loading time should be larger than 0"
       
        if (parseFloat(SecondDimensionModulation2ModulationTime) > parseFloat(SecondDimensionModulation2Time) || parseFloat(SecondDimensionModulation2LoadingTime) > parseFloat(SecondDimensionModulation2ModulationTime)) return "modulation time invalid2"


        let SecondDimensionModulation3Time = controls['ComprehensiveSecondDimensionModulation3Time'].value
        if (SecondDimensionModulation3Time == '' || isNaN(SecondDimensionModulation3Time) || parseFloat(SecondDimensionModulation3Time) < 0) return "2D modulation time should be larger than 0"

        let SecondDimensionModulation3ModulationTime = controls['ComprehensiveSecondDimensionModulation3ModulationTime'].value
        if (SecondDimensionModulation3ModulationTime == '' || isNaN(SecondDimensionModulation3ModulationTime) || parseFloat(SecondDimensionModulation3ModulationTime) < 0) return "2D modulation time should be larger than 0"

        let SecondDimensionModulation3LoadingTime = controls['ComprehensiveSecondDimensionModulation3LoadingTime'].value
        if (SecondDimensionModulation3LoadingTime == '' || isNaN(SecondDimensionModulation3LoadingTime) || parseFloat(SecondDimensionModulation3LoadingTime) < 0) return "2D modulation loading time should be larger than 0"
        
        if (parseFloat(SecondDimensionModulation3ModulationTime) > parseFloat(SecondDimensionModulation3Time) || parseFloat(SecondDimensionModulation3LoadingTime) >  parseFloat(SecondDimensionModulation3ModulationTime)) return "modulation time invalid3"

        let SecondDimensionModulation4Time = controls['ComprehensiveSecondDimensionModulation4Time'].value
        if (SecondDimensionModulation4Time == '' || isNaN(SecondDimensionModulation4Time) || parseFloat(SecondDimensionModulation4Time) < 0) return "2D modulation time should be larger than 0"

        let SecondDimensionModulation4ModulationTime = controls['ComprehensiveSecondDimensionModulation4ModulationTime'].value
        if (SecondDimensionModulation4ModulationTime == '' || isNaN(SecondDimensionModulation4ModulationTime) || parseFloat(SecondDimensionModulation4ModulationTime) < 0) return "2D modulation time should be larger than 0"

        let SecondDimensionModulation4LoadingTime = controls['ComprehensiveSecondDimensionModulation4LoadingTime'].value
        if (SecondDimensionModulation4LoadingTime == '' || isNaN(SecondDimensionModulation4LoadingTime) || parseFloat(SecondDimensionModulation4LoadingTime) < 0) return "2D modulation loading time should be larger than 0"
        
        if (parseFloat(SecondDimensionModulation4ModulationTime) > parseFloat(SecondDimensionModulation4Time) || parseFloat(SecondDimensionModulation4LoadingTime) > parseFloat(SecondDimensionModulation4ModulationTime)) return "modulation time invalid4"

        // 2D Column Checking
        let SecondDimensionAColumnTime1 = controls['ComprehensiveSecondDimensionColumnTime1'].value
        if (SecondDimensionAColumnTime1 == '' || isNaN(SecondDimensionAColumnTime1) || parseFloat(SecondDimensionAColumnTime1) < 0) return "2D column time should be positive number"

        let SecondDimensionAColumnPWM1 = controls['ComprehensiveSecondDimensionColumnPWM1'].value
        if (SecondDimensionAColumnPWM1 == '' || isNaN(SecondDimensionAColumnPWM1) || parseFloat(SecondDimensionAColumnPWM1) < 0 || parseFloat(SecondDimensionAColumnPWM1) > 100) return "2D column PWN should be between 0 and 100"

        let SecondDimensionAColumnTime2 = controls['ComprehensiveSecondDimensionColumnTime2'].value
        if (SecondDimensionAColumnTime2 == '' || isNaN(SecondDimensionAColumnTime2) || parseFloat(SecondDimensionAColumnTime2) < 0) return "2D column time should be positive number"

        let SecondDimensionAColumnPWM2 = controls['ComprehensiveSecondDimensionColumnPWM2'].value
        if (SecondDimensionAColumnPWM2 == '' || isNaN(SecondDimensionAColumnPWM2) || parseFloat(SecondDimensionAColumnPWM2) < 0 || parseFloat(SecondDimensionAColumnPWM2) > 100) return "2D column PWN should be between 0 and 100"

        let SecondDimensionAColumnTime3 = controls['ComprehensiveSecondDimensionColumnTime3'].value
        if (SecondDimensionAColumnTime3 == '' || isNaN(SecondDimensionAColumnTime3) || parseFloat(SecondDimensionAColumnTime3) < 0) return "2D column time should be positive number"

        let SecondDimensionAColumnPWM3 = controls['ComprehensiveSecondDimensionColumnPWM3'].value
        if (SecondDimensionAColumnPWM3 == '' || isNaN(SecondDimensionAColumnPWM3) || parseFloat(SecondDimensionAColumnPWM3) < 0 || parseFloat(SecondDimensionAColumnPWM3) > 100) return "2D column PWN should be between 0 and 100"

        let SecondDimensionAColumnTime4 = controls['ComprehensiveSecondDimensionColumnTime4'].value
        if (SecondDimensionAColumnTime4 == '' || isNaN(SecondDimensionAColumnTime4) || parseFloat(SecondDimensionAColumnTime4) < 0) return "2D column time should be positive number"

        let SecondDimensionAColumnPWM4 = controls['ComprehensiveSecondDimensionColumnPWM4'].value
        if (SecondDimensionAColumnPWM4 == '' || isNaN(SecondDimensionAColumnPWM4) || parseFloat(SecondDimensionAColumnPWM4) < 0 || parseFloat(SecondDimensionAColumnPWM4) > 100) return "2D column PWN should be between 0 and 100"

        let SecondDimensionAColumnTime5 = controls['ComprehensiveSecondDimensionColumnTime5'].value
        if (SecondDimensionAColumnTime5 == '' || isNaN(SecondDimensionAColumnTime5) || parseFloat(SecondDimensionAColumnTime5) < 0) return "2D column time should be positive number"

        let SecondDimensionAColumnPWM5 = controls['ComprehensiveSecondDimensionColumnPWM5'].value
        if (SecondDimensionAColumnPWM5 == '' || isNaN(SecondDimensionAColumnPWM5) || parseFloat(SecondDimensionAColumnPWM5) < 0 || parseFloat(SecondDimensionAColumnPWM5) > 100) return "2D column PWN should be between 0 and 100"


        // 2D Pump Setting
        let SecondDimensionPump = controls['ComprehensiveSecondDimensionPump'].value
        if (SecondDimensionPump == '' || isNaN(SecondDimensionPump) || parseFloat(SecondDimensionPump) < 0) return "2D pump voltage should be positive number"

        // 2D Cleaning Setting
        let SecondDimensionCleaningTime = controls['ComprehensiveSecondDimensionPIDCleanTime'].value
        if (SecondDimensionCleaningTime == '' || isNaN(SecondDimensionCleaningTime) || parseFloat(SecondDimensionCleaningTime) < 0) return "2D PID clean time show be larger than 0"

        let SecondDimensionCleaningPWM = controls['ComprehensiveSecondDimensionPIDCleanPWM'].value
        if (SecondDimensionCleaningPWM == '' || isNaN(SecondDimensionCleaningPWM) || parseFloat(SecondDimensionCleaningPWM) < 0 || parseFloat(SecondDimensionCleaningPWM) > 100) return "2D PID clean pwm should be between 0 and 100"
        return "";
    }

    private validateParam(GCType: string) {
        return GCType == constants.COMPREHENSIVE? this.validateComprehensiveParam() : this.validateNonComprehensiveParam()
    }

    public openDialog(msg): void {
        let dialogConfig = new MatDialogConfig()
        dialogConfig.data = {
            msg:msg
        }

        this.dialog.open(DialogPageComponent, dialogConfig);
    }

    private validateStartTime(startTime): string {
        if (startTime == '') return "start time should not be empty"
        startTime = startTime.split(":")

        if (startTime.length != 2) return "start time invalid"
        let hour = startTime[0]
        let minute = startTime[1]

        if (hour.length != 2 && hour.length != 1) return "start time invalid"
        for (let i = 0; i < hour.length; i++) {
            let elem = hour.charAt(i)
            if (elem < '0' || elem > '9') return "start time invalid"
        }

        if (minute.length != 2 && minute.length != 1) return "start time invalid"
        for (let i = 0; i < minute.length; i++) {
            let elem = minute.charAt(i)
            if (elem < '0' || elem > '9') return "start time invalid"
        }

        hour = parseInt(hour)
        minute = parseInt(minute)

        if (hour < 0 || hour > 23) return "start time invalid"
        if (minute < 0 || minute > 59) return "start time invalid"
        return ""
    }

    private ValidateRunCountAndInterval(count, interval) {
        if (count == '' || isNaN(count) || parseFloat(count) < 0) return "invalid count value"
        if (interval == '' || isNaN(interval) || parseFloat(interval) < 0) return "invalid interval value"
        return ""
    }






















    public PurposeChange($event) {
        this.selectedPurpose = $event.value
        if (this.selectedPurpose == constants.MULTIGRAP) {
            document.getElementById("SoftwarePicker").style.display = "block";
            document.getElementById("DevicePicker").style.display = "none";
            document.getElementById("MethodPicker").style.display = "none";
            document.getElementById("MultiGraphFilePicker").style.display = "none";
            document.getElementById("ContinousFilePicker").style.display = "none";
        } else{
            this.Devices = [];
            this.Devices = this.electronService.loadDeviceIds();
            document.getElementById("SoftwarePicker").style.display = "none";
            document.getElementById("DevicePicker").style.display = "block";
            document.getElementById("MethodPicker").style.display = "none";
            document.getElementById("MultiGraphFilePicker").style.display = "none";
            document.getElementById("ContinousFilePicker").style.display = "none";
        }
    }

    public SoftwareChange($event) {
        this.selectedSoftware = $event.value
        if (this.selectedSoftware == constants.NOVASOFT_V1) {
            this.Devices = [];
            //list device id folders under NovaSoft 1.o Data
            this.Devices = this.electronService.loadDeviceIds();
            document.getElementById("DevicePicker").style.display = "block";
            document.getElementById("MethodPicker").style.display = "none";
            document.getElementById("MultiGraphFilePicker").style.display = "none";
            document.getElementById("ContinousFilePicker").style.display = "none";

        } else {
            this.Methods = [];
            //list device id folders under NovaSoft 1.o Data
            this.Methods = this.electronService.loadNovasoftV2Methods();
            document.getElementById("DevicePicker").style.display = "none";
            document.getElementById("MethodPicker").style.display = "block";
            document.getElementById("MultiGraphFilePicker").style.display = "none";
            document.getElementById("ContinousFilePicker").style.display = "none";
        }
    }

    public DeviceChange($event) {
        this.selectedDevice = $event.value
        this.Methods = [];      
        //list methods folders under this device folder
        let purposeIndicator: string;
        if(this.selectedPurpose == constants.MULTIGRAP)
        {
            purposeIndicator = constants.V1_EXPORT_FOLDER;
        }
        else{
            purposeIndicator = constants.CONTINOUS_FILE_FOLDER;
        }
        this.Methods = this.electronService.loadNovasoftV1Methods(this.selectedDevice, purposeIndicator);
        document.getElementById("MethodPicker").style.display = "block";
        document.getElementById("MultiGraphFilePicker").style.display = "none";
        document.getElementById("ContinousFilePicker").style.display = "none";
    }

    public MethodChange($event) {
        this.selectedMethod = $event.value      
        if(this.selectedPurpose == constants.MULTIGRAP)
        {
            this.MultiGraphFiles = [];
            //list all files under quick test folder and cali folder of this method
            this.MultiGraphFiles = this.electronService.loadFiles(this.selectedSoftware, this.selectedDevice, constants.V1_EXPORT_FOLDER, this.selectedMethod);
            document.getElementById("MultiGraphFilePicker").style.display = "block";
            document.getElementById("ContinousFilePicker").style.display = "none";
        }
        else{
            this.ContinousFiles = [];
            //list all scheduled files under this method
            this.ContinousFiles = this.electronService.loadFiles(this.selectedSoftware, this.selectedDevice, constants.CONTINOUS_FILE_FOLDER,this.selectedMethod);
            document.getElementById("MultiGraphFilePicker").style.display = "none";
            document.getElementById("ContinousFilePicker").style.display = "block";
        }       
    }
  
}

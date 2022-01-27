import { Injectable } from '@angular/core';

// If you import a module but never use any of the imported values other than as TypeScript types,
// the resulting javascript file will look as if you never imported the module at all.
import { ipcRenderer, webFrame, remote } from 'electron';
import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path'
import { constants } from '../../constants/constants';

@Injectable({
  providedIn: 'root'
})

export class ElectronService {
    
    ipcRenderer: typeof ipcRenderer;
    webFrame: typeof webFrame;
    remote: typeof remote;
    childProcess: typeof childProcess;
    fs: typeof fs;
    os: typeof os;
    path: typeof path;
    novaFileBaseDir: string;
    novaV1BaseDir: string;
    novaV2BaseDir: string;

    get isElectron(): boolean {
        return !!(window && window.process && window.process.type);
    }

    constructor() {
        // Conditional imports
        if (this.isElectron) {
            this.ipcRenderer = window.require('electron').ipcRenderer;
            this.webFrame = window.require('electron').webFrame;

            // If you wan to use remote object, pleanse set enableRemoteModule to true in main.ts
            // this.remote = window.require('electron').remote;

            this.childProcess = window.require('child_process');
            this.fs = window.require('fs');
            this.os = window.require('os');
            this.path = window.require('path')
            this.novaFileBaseDir = this.path.join(this.os.homedir(), constants.DOCUMENTS, constants.NOVASOFT_IARPA_DATA)
            this.novaV1BaseDir = this.path.join(this.os.homedir(), constants.DOCUMENTS, constants.V1_DOCUMENTS)
            this.novaV2BaseDir = this.path.join(this.os.homedir(), constants.DOCUMENTS, constants.V2_DOCUMENTS)
        }
    }

    public async saveFile(filePath: string, blob: Blob) {
        if (this.isElectron) {
            try {
                const absolutePath = this.generateAbsolutePath(filePath);
                let buffer = await blob.arrayBuffer();
                this.fs.createWriteStream(absolutePath).write(new Buffer(buffer))
            } catch (err) {
                console.log(err)
            }
        }
        
    }

    public saveTextFile(filePath: string, content: string) {
        if (this.isElectron) {
            const absolutePath = this.generateAbsolutePath(filePath)
            this.fs.writeFileSync(absolutePath, content)
        }
    }

    public readTextFile(filePath: string) : string{
        if (this.isElectron) {
            const absolutePath = this.generateAbsolutePath(filePath);
            let content = this.fs.readFileSync(absolutePath, 'utf8')
            return content
        }
    }

    private generateAbsolutePath(filePath: string) { 
        try {
            filePath = this.path.join(this.novaFileBaseDir, filePath)
            const targetDir = this.path.parse(filePath).dir
            if (!this.fs.existsSync(targetDir)) this.fs.mkdirSync(targetDir, {recursive: true})
            return filePath
        } catch (err) {
            console.log(err)
        }
    }

    public checkExists(localFiles: string[], remoteFile: string): Boolean {
        if (this.isElectron) {
            let normalizedLocalFiles = []
            localFiles.forEach(localFile => {
                let normalizedlocalFile = localFile.split("/").join("").split("\\").join("").trim();
                normalizedLocalFiles.push(normalizedlocalFile)
            })

            let normalizedRemoteFile = remoteFile.split("/").join("").split("\\").join("").trim();
            return normalizedLocalFiles.includes(normalizedRemoteFile);
        }
        /* avoid file downloading if run in browser */
        return true;
    }

    public checkFileExists(filePath: string): Boolean {
        if (this.isElectron) return this.fs.existsSync(this.path.join(this.novaFileBaseDir, filePath));
        else return false
    }

    private loadFileRecursively(basePath: string): string[] {
        let files = [];
        if (this.fs.existsSync(basePath)) {
            this.fs.readdirSync(basePath).forEach(item => {
                if(this.fs.lstatSync(this.path.resolve(basePath, item)).isDirectory()) {
                    let subFiles = this.loadFileRecursively(this.path.join(basePath, item))
                    subFiles.forEach(subFile => {
                        files.push(subFile)
                    })
                } else {
                    // remove basedir to make it easier to compare with path fetch from remote
                    files.push(this.path.join(basePath, item).split(this.novaFileBaseDir)[1])
                }
            })
        }
        return files;
    }

    public loadFileFromNovaDocBaseDir(): string[] {
        let files = []
        if (this.isElectron) {
            try {
                files = this.loadFileRecursively(this.novaFileBaseDir)
            } catch (err) {
                console.log(err)
            }
        } 
        return files
    }

    public loadRawFiles(): string[] {
        let files = []
        this.loadFileFromNovaDocBaseDir().forEach(file => {
            if (file.includes("_RawChrom.dat")) {
                files.push(file)
            }
        })
        return files
    }

    public loadDeviceIds(): string[]
    {
        let ids = [];
        if (this.fs.existsSync(this.novaV1BaseDir))
        {
            this.fs.readdirSync(this.novaV1BaseDir).forEach(item => {
                if(this.fs.lstatSync(this.path.resolve(this.novaV1BaseDir, item)).isDirectory()) {
                    ids.push(item);
                }
            })
        }       
        return ids
    }

    public loadNovasoftV1Methods(deviceId: string, purposeIndicator: string): string[]
    {
        let methods = [];
        let methodPath = this.path.join(this.novaV1BaseDir, deviceId, purposeIndicator, constants.QUICK_TEST_FOLDER)
        if (this.fs.existsSync(methodPath))
        {
            this.fs.readdirSync(methodPath).forEach(item => {
                if(this.fs.lstatSync(this.path.resolve(methodPath, item)).isDirectory()) {
                    methods.push(item);
                }
            })
        }
        let calimethodPath = this.path.join(this.novaV1BaseDir, deviceId, purposeIndicator, constants.CALI_TEST_FOLDER)
        if (this.fs.existsSync(calimethodPath))
        {
            this.fs.readdirSync(calimethodPath).forEach(item => {
                if(this.fs.lstatSync(this.path.resolve(calimethodPath, item)).isDirectory()) {
                    if(!methods.includes(item))
                    {
                        methods.push(item);
                    }
                }
            })
        }
        if (purposeIndicator == constants.V1_EXPORT_FOLDER && this.fs.existsSync(this.path.join(this.novaV1BaseDir, deviceId, purposeIndicator, constants.CUSTOMIZED_TEST_FOLDER)))
        {
            methods.push(constants.CUSTOMIZED_TEST_FOLDER)
        }
        return methods
    }

    public loadNovasoftV2Methods(): string[]
    {
        let methods = [];
        let methodPath = this.path.join(this.novaV2BaseDir, constants.V2_EXPORT_FOLDER)
        this.fs.readdirSync(methodPath).forEach(item => {
            if(this.fs.lstatSync(this.path.resolve(methodPath, item)).isDirectory()) {
                methods.push(item);
            }
        })
        return methods
    }

    public loadFiles(software: string, deviceId: string, CompareOrContinous: string, method: string): string[]
    {
        let files = [];
        if(software == constants.NOVASOFT_V2)
        {
            let filePath = this.path.join(this.novaV2BaseDir, constants.V2_EXPORT_FOLDER, method)
            if (this.fs.existsSync(filePath))
            {
                this.fs.readdirSync(filePath).forEach(file => {
                    if(this.fs.lstatSync(this.path.resolve(filePath, file)).isFile())
                    {
                        files.push(file);
                    }
                    
                  });
            } 
        }
        else
        {
            let filePath = this.path.join(this.novaV1BaseDir, deviceId, CompareOrContinous, constants.QUICK_TEST_FOLDER, method)
            if (this.fs.existsSync(filePath))
            {
                this.fs.readdirSync(filePath).forEach(file => {
                //if(this.fs.lstatSync(this.path.resolve(filePath, file)).isFile())
                    {
                        files.push(file);
                    }
              });
            }       
            let caliFilePath = this.path.join(this.novaV1BaseDir, deviceId, CompareOrContinous, constants.CALI_TEST_FOLDER, method)
            if (this.fs.existsSync(caliFilePath))
            {
                this.fs.readdirSync(caliFilePath).forEach(file => {
                //if(this.fs.lstatSync(this.path.resolve(filePath, file)).isFile())
                    {
                        files.push(file);
                    }
              });
            }
        }        
        return files
    }

    public readContinousFiles(deviceId: string, method: string, fileName: string) :string[]
    {
        let filePath = this.path.join(this.novaV1BaseDir, deviceId, constants.CONTINOUS_FILE_FOLDER, constants.QUICK_TEST_FOLDER, method, fileName)
        let content = this.fs.readFileSync(filePath, 'utf8').split("\n")
        return content
    }
}

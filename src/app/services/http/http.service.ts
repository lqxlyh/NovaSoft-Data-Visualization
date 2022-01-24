import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http'
import { constants } from '../../constants/constants';

@Injectable({
  providedIn: 'root'
})
export class HttpService {

    private TIMEOUT_VALUE_IN_MILLI_SECONDS = 5000;
    constructor(private httpClient: HttpClient) { }
  
    public async listFiles(): Promise<string[]> {
        let url = constants.RASPBERRY_PI_SERVICE_BASE_URL.concat(constants.LIST_FILES_PATH)
        return await this.httpClient.get(url, {responseType: 'text'}).toPromise().then((res) => {return res.split(',')});
    }

    public async downloadFile(path: string): Promise<Blob> {
        let downloadFileUrl = constants.RASPBERRY_PI_SERVICE_BASE_URL.concat(constants.DOWNLOAD_FILE_PATH)
        .concat(path)
        return await this.httpClient.get(downloadFileUrl, {responseType: 'blob'}).toPromise();
    }

    public async updateParam(param: string, GCTYPE: string): Promise<Boolean> {
        let url = constants.RASPBERRY_PI_SERVICE_BASE_URL.concat(constants.UPDATE_PARAM_PATH)
        param = (GCTYPE == constants.NON_COMPREHENSIVE? constants.NON_COMPREHENSIVE_UPDATE_PARAM_COMMAND : constants.COMPREHENSIVE_UPDATE_PARAM_COMMAND) + param
        return await this.httpClient.post<Boolean>(url, param).toPromise()
    }

    public async startTest(GCTYPE: string): Promise<Boolean> {
        let url = constants.RASPBERRY_PI_SERVICE_BASE_URL.concat(constants.START_TEST_PATH)
        let param = (GCTYPE == constants.COMPREHENSIVE ? constants.COMPREHENSIVE_START_TEST_COMMAND : constants.NON_COMPREHENSIVE_START_TEST_COMMAND)
        return await this.httpClient.post<Boolean>(url, param).toPromise()
    }

    public async ping(): Promise<Boolean> {
        let pingable = true;
        let url = constants.RASPBERRY_PI_SERVICE_BASE_URL.concat(constants.PING_PATH);
        let promise = this.httpClient.post<Boolean>(url, "").toPromise();
        try {
            pingable = await this.timeout(this.TIMEOUT_VALUE_IN_MILLI_SECONDS, promise);
        } catch (err) {
            pingable = false;
        } finally {
            return pingable;
        }
    }

    public async fetchRealTimeData(): Promise<string> {
        let fetchRealTimeDataUrl = constants.RASPBERRY_PI_SERVICE_BASE_URL.concat(constants.FETCH_REAL_TIME_DATA_PATH)
        console.log(fetchRealTimeDataUrl)
        return await this.httpClient.get(fetchRealTimeDataUrl, {responseType: 'text'}).toPromise();
    }

    public async stopTest(): Promise<Boolean> {
        let stopTestUrl = constants.RASPBERRY_PI_SERVICE_BASE_URL.concat(constants.STOP_TEST_PATH)
        return await this.httpClient.post<Boolean>(stopTestUrl, constants.STOP_TEST_COMMAND).toPromise()
    }
 
    public timeout(ms, promise): Promise<any> {
        let timeout = new Promise((resolve, reject) => {
            let id = setTimeout(() => {
              clearTimeout(id);
              reject('time out')
            }, ms)
          })
        
          // Returns a race between our timeout and the passed in promise
          return Promise.race([
            promise,
            timeout
          ])
    }
}

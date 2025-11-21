import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface devices{
  isMobileView : boolean,
  isIpadMini : boolean
}

@Injectable({
  providedIn: 'root'
})
export class WindowResizeService {
  
  devices : devices = {isMobileView : false, isIpadMini : false}
  private currentScreenStatus: BehaviorSubject<any> = new BehaviorSubject<any>(this.devices);
  currentScreenWidth!: number;

  setScreenWidth(width: number) {
    this.currentScreenWidth = width;
    if (width < 901) {
      if(width> 766)
        this.currentScreenStatus.next({ ... this.devices, isMobileView : true, isIpadMini : true});
      else
        this.currentScreenStatus.next({ ... this.devices, isMobileView : true, isIpadMini: false});
    }
    else{
      this.currentScreenStatus.next(this.devices);
    }
  }

  checkForWindowSize(): Observable<object> {
    return this.currentScreenStatus.asObservable();
  }
}

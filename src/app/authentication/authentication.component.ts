import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, onAuthStateChanged } from 'firebase/auth';
import { AccountService } from '../services/account.service';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FirebaseService } from '../services/firebase.service';
import { Admin } from '../../assets/models/Admin';
import { NotificationService } from '../services/notification.service';
import { APPLICATION_DATA } from '../shared/constants';
import { devices, WindowResizeService } from '../services/window-resize.service';
import { Subject, takeUntil } from 'rxjs';
import { LoaderService } from '../services/loader.service';

@Component({
  selector: 'app-authentication',
  templateUrl: './authentication.component.html',
  styleUrl: './authentication.component.scss',
  imports: [
    CommonModule,
    NgxMaskDirective,
    MatButtonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule
  ],
  providers: [
    provideNgxMask(),
    AngularFireAuth
  ],
})
export class AuthenticationComponent implements OnInit, OnDestroy {

  message = {
    LOGIN: 'Log in.',
    SIGNUP: 'Sign up.',
    LOGIN_SUBTEXT: 'Login using your registered contact number.',
    SIGNUP_SUBTEXT: 'Create a new account using a phone number.',
    WELCOME_BACK: 'Welcome Back',
  };

  loginForm: FormGroup = new FormGroup({
    phoneNumber: new FormControl('', [Validators.required, Validators.minLength(10), Validators.maxLength(10), Validators.pattern(/^[6-9]\d{9}$/)]),
    otp: new FormControl(''),
  });

  signupForm: FormGroup = new FormGroup({
    fullName: new FormControl('', [Validators.required, Validators.minLength(3), Validators.maxLength(30)]),
    phoneNumber: new FormControl('', [Validators.required, Validators.minLength(10), Validators.maxLength(10), Validators.pattern(/^[6-9]\d{9}$/)]),
    accessKey: new FormControl('', [Validators.required, Validators.minLength(10), Validators.maxLength(20)]),
    otp: new FormControl(''),
  });

  isLogin = true;
  isOtpSent = false;
  disableButtons = false;
  confirmationResult?: any;
  recaptchaVerifier?: any;
  activeFormGroup: FormGroup = this.loginForm;
  isMaleGender = true;
  accessKey: any;
  authData: any;
  localStorage = APPLICATION_DATA;
  resendOtpCount = 30;
  devices!: devices;
  mobCurrentPage = 'welcome';

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private afAuth: AngularFireAuth,
    private accountService: AccountService,
    private firebaseService: FirebaseService,
    private notificationService: NotificationService,
    private windowResizeService: WindowResizeService,
    private loaderService: LoaderService
  ) { }

  async ngOnInit(): Promise<void> {
    this.windowResizeService.checkForWindowSize().pipe(takeUntil(this.destroy$)).subscribe((devicesObj: any) => this.devices = devicesObj);

    const auth = getAuth();
    onAuthStateChanged(auth, (user: any) => {
      if (user) {
        const userId = user.uid;
        this.firebaseService.getloggedInUserData(userId).then(userData => {
          if (userData) {
            this.accountService.setUserData(userData);
            if (!this.isOtpSent)
              this.notificationService.welcomeBack(userData.data.fullName); // welcome back notification
            this.accountService.setAuthData({
              user: {
                uid: user.uid,
                createdAt: user.metadata.createdAt,
                lastLoginAt: user.metadata.lastLoginAt
              }
            });
            this.router.navigate(['/dashboard']);
          }
        });
      }
    });

    this.loginForm.get('otp')?.disable();

    // if (this.accountService.hasUserData()) {
    //   this.router?.navigate(['/dashboard']);
    //   return;
    // }

    this.accessKey = await this.firebaseService.getData('others/accessKey');
    console.log('Access Key Data:', this.accessKey);
  }

  loginBtnClick() {
    if (this.isLogin) {
      this.initateOTPAction();
    } else {
      this.isLogin = true;
      this.activeFormGroup = this.loginForm;
    }
  }

  createNewAccBtnClick() {
    if (this.isLogin) {
      this.isLogin = false;
      this.activeFormGroup = this.signupForm;
    } else {
      if (this.accessKey) {
        if (this.accessKey.key === this.signupForm.get('accessKey')?.value && this.accessKey.number === this.signupForm.get('phoneNumber')?.value)
          this.initateOTPAction();
        else
          this.signupForm.get('phoneNumber')?.setErrors({ 'access-key-not-generated': true });
      } else
        this.signupForm.get('phoneNumber')?.setErrors({ 'access-key-not-generated': true });
    }
  }

  checkCaptchaAndSendOTP() {
    const auth = getAuth();

    this.disableButtons = true;
    this.loaderService.showWithLoadingText('Sending OTP...');

    if (!this.recaptchaVerifier) {
      this.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        'callback': () => {
          console.log('reCAPTCHA verified');
        }
      });
    }

    this.recaptchaVerifier.render().then(() => {
      signInWithPhoneNumber(auth, '+91' + this.activeFormGroup.get('phoneNumber')?.value, this.recaptchaVerifier)
        .then((confirmationResult) => {
          this.confirmationResult = confirmationResult;
          this.updateOtpSentStatus(true);
          this.disableButtons = false;
          this.loaderService.hide();
        })
        .catch((error) => {
          this.disableButtons = false;
          this.loaderService.hide();
          if (error.toString().includes('billing-not-enabled'))
            this.activeFormGroup.get('phoneNumber')?.setErrors({ 'billing-not-enabled': true });
        });
    });
  }

  verifyOtp() {
    const verificationCode = this.activeFormGroup.get('otp')?.value;

    this.disableButtons = true;
    this.loaderService.showWithLoadingText('Verifying OTP...');

    this.confirmationResult?.confirm(verificationCode)
      .then((result: any) => {
        this.authData = result;
        this.disableButtons = false;
        this.authVerifiedCheckAndOpenDashboard();
      })
      .catch(() => {
        this.activeFormGroup.get('otp')?.setErrors({ invalidOTP: true });
        this.activeFormGroup.updateValueAndValidity();
        this.disableButtons = false;
        this.loaderService.hide();

        this.notificationService.showNotification({
          heading: 'Invalid OTP.',
          message: 'Please try again.',
          duration: 3000,
          leftBarColor: '#ff0000'
        });
      });
  }

  async authVerifiedCheckAndOpenDashboard() {
    this.loaderService.setLoaderText('Checking account details...');

    let data: Admin = await this.firebaseService.getData(`admin/${this.authData?.user?.uid}`);
    if (Object.keys(data).length > 0) {
      this.accountService.setAuthData(this.authData);
      this.accountService.setUserData(data);
      this.loaderService.hide();
      this.router?.navigate(['/dashboard']);

      this.notificationService.showNotification({
        heading: 'Log in successful.',
        duration: 5000,
        leftBarColor: '#3A7D44'
      });
    } else {
      if (this.isLogin) {
        this.isOtpSent = false;
        this.loaderService.hide();
        this.createNewAccBtnClick();

        this.notificationService.showNotification({
          heading: 'No Account found!',
          message: 'Please create an account first!',
          duration: 5000,
          leftBarColor: '#FBA518'
        });
      } else {
        this.loaderService.setLoaderText('Creating account...');
        data = {
          data: {
            fullName: this.activeFormGroup.get('fullName')?.value,
            male: this.isMaleGender,
            contact: {
              countryCode: '91',
              phoneNumber: this.activeFormGroup.get('phoneNumber')?.value,
            },
            importantTimes: {
              lastSeen: Date.now()
            },
            permission: {
              verified: false,
              blocked: false
            },
            userID: this.authData?.user?.uid
          }
        };

        this.firebaseService.setData(`admin/${this.authData?.user?.uid}`, data).then(() => {
          this.accountService.setAuthData(this.authData);
          this.accountService.setUserData(data);
          this.loaderService.hide();
          this.router?.navigate(['/dashboard']);
        }).catch(() => {
          this.loaderService.hide();
          this.notificationService.showNotification({
            heading: 'Something Went Wrong!',
            message: 'Please Contact IT Support!',
            duration: 5000,
            leftBarColor: '#ff0000'
          });
        });
      }
    }
  }

  getErrorMessage(controlName: string) {
    if (controlName === 'phoneNumber') {
      if (this.activeFormGroup.controls[controlName].hasError('required'))
        return 'Please enter your contact number.';
      else if (this.activeFormGroup.controls[controlName].hasError('minlength'))
        return 'Please enter 10 digit phone number.';
      else if (this.activeFormGroup.controls[controlName].hasError('billing-not-enabled'))
        return 'Something went wrong! Please contact IT Support.';
      else if (this.activeFormGroup.controls[controlName].hasError('access-key-not-generated'))
        return 'No access key generated for this number! Please contact IT Support.';
      else if (this.activeFormGroup.controls[controlName].hasError('pattern'))
        return 'Please enter a valid Indian phone number.';
    } else if (controlName === 'accessKey') {
      if (this.activeFormGroup.controls[controlName].hasError('required'))
        return 'Please enter your access key.';
      else if (this.activeFormGroup.controls[controlName].hasError('minlength'))
        return 'Please enter atleast 5 characters.';
    } else if (controlName === 'otp') {
      if (this.activeFormGroup.controls[controlName].hasError('required'))
        return 'Please enter OTP.';
      else if (this.activeFormGroup.controls[controlName].hasError('minlength'))
        return 'Please enter 6 digit OTP.';
      else if (this.activeFormGroup.controls[controlName].hasError('invalidOTP'))
        return 'Invalid OTP. Please try again.';
    }
    return '';
  }

  getShortName() {
    const name = this.signupForm.get('fullName')?.value;
    const names = name.split(' ');
    return names[0];
  }

  initateOTPAction() {
    if (this.isOtpSent)
      this.verifyOtp();
    else
      this.checkCaptchaAndSendOTP();
  }

  updateOtpSentStatus(newStatus: boolean) {
    if (newStatus) {
      this.activeFormGroup.get('phoneNumber')?.disable();
      this.activeFormGroup.get('otp')?.addValidators([Validators.required, Validators.minLength(6), Validators.maxLength(6)]);
    } else {
      this.activeFormGroup.get('phoneNumber')?.enable();
      this.activeFormGroup.get('otp')?.clearValidators();
      this.activeFormGroup.get('otp')?.reset();
    }
    this.activeFormGroup.get('otp')?.updateValueAndValidity();
    this.isOtpSent = newStatus;
    if (this.isOtpSent) this.startCountDown();
  }

  startCountDown() {
    this.resendOtpCount = 30;
    const interval = setInterval(() => {
      if (this.resendOtpCount > 0)
        this.resendOtpCount--;
      else
        clearInterval(interval);
    }, 1000);
  }

  ngOnDestroy(): void {
    this.destroy$.next(); // Emit a value to complete all subscriptions
    this.destroy$.complete(); // Complete the Subject
  }
}

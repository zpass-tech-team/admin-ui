import {
  Component,
  ElementRef,
  ViewChildren
} from '@angular/core';
import { Location } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { DataStorageService } from 'src/app/core/services/data-storage.service';
import { DialogComponent } from 'src/app/shared/dialog/dialog.component';
import { CenterDropdown } from 'src/app/core/models/center-dropdown';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import Utils from '../../../../app.utils';
import * as appConstants from '../../../../app.constants';
import {
  ValidateLatLong,
  ValidateKiosk
} from 'src/app/core/validators/center.validator';
import { AppConfigService } from 'src/app/app-config.service';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { HeaderModel } from 'src/app/core/models/header.model';
import { CenterLangModel } from 'src/app/core/models/center-lang.model';
import { CenterNonLangModel } from 'src/app/core/models/center-non-lang.model';
import { RequestModel } from 'src/app/core/models/request.model';
import { CenterService } from 'src/app/core/services/center.service';
import { CenterRequest } from 'src/app/core/models/centerRequest.model';
import { FilterModel } from 'src/app/core/models/filter.model';
import { Observable } from 'rxjs';
import { FilterRequest } from 'src/app/core/models/filter-request.model';
import { FilterValuesModel } from 'src/app/core/models/filter-values.model';
import { OptionalFilterValuesModel } from 'src/app/core/models/optional-filter-values.model';
import {
  MatKeyboardRef,
  MatKeyboardComponent,
  MatKeyboardService
} from '@ngx-material-keyboard/core';
import { AuditService } from 'src/app/core/services/audit.service';
import * as centerSpecFile from '../../../../../assets/entity-spec/center.json';
import { HeaderService } from 'src/app/core/services/header.service';
import { HolidayModel } from 'src/app/core/models/holiday-model';
import defaultJson from "../../../../../assets/i18n/default.json";

import moment from 'moment';
import { MAT_MOMENT_DATE_FORMATS, MomentDateAdapter } from '@angular/material-moment-adapter';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE} from '@angular/material/core';

@Component({
  selector: 'app-edit',
  templateUrl: './edit.component.html',
  styleUrls: ['./edit.component.scss'],
  providers: [
    {provide: MAT_DATE_LOCALE, useValue: 'en-GB'},
    {
      provide: DateAdapter,
      useClass: MomentDateAdapter
    },
    {provide: MAT_DATE_FORMATS, useValue: MAT_MOMENT_DATE_FORMATS},
  ],
})
export class EditComponent {
  secondaryLanguageLabels: any;
  primaryLang: string;
  secondaryLang: string;
  isPrimaryLangRTL: boolean;
  isSecondaryLangRTL: boolean;
  selectLanguagesArr: any;
  supportedLanguages: Array<string>;
  filteredLanguages: Array<string>;
  dropDownValues = new CenterDropdown();
  dynamicDropDown = {};
  allSlots: string[];
  headerObject: HeaderModel;
  centerRequest = {} as CenterRequest;
  createUpdate = false;
  showSecondaryForm: boolean;
  secondaryObject: any;
  centerId: string;
  primaryForm: FormGroup;
  secondaryForm: FormGroup;
  commonForm: FormGroup;
  disablePrimaryForm: boolean;
  disableSecondaryForm: boolean;
  data = [];
  popupMessages: any;
  serverError:any;
  selectedField: HTMLElement;
  private keyboardRef: MatKeyboardRef<MatKeyboardComponent>;
  @ViewChildren('keyboardRef', { read: ElementRef })
  private attachToElementMesOne: any;
  primaryKeyboard: string;
  secondaryKeyboard: string;
  keyboardType: string;
  subscribed: any;
  days = [];  
  holidayDate: any;
  minDate = new Date();
  locCode = 0;
  initialLocationCode: "";
  localeDtFormat = "";
  locationFieldNameList: string[] = [];
  dynamicFieldValue = {};
  showSpinner = false;
  showUpdateButton = null;
  constructor(
    private location: Location,
    private translateService: TranslateService,
    private headerService: HeaderService,
    private dataStorageService: DataStorageService,
    private dialog: MatDialog,
    private formBuilder: FormBuilder,
    private appConfigService: AppConfigService,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private centerService: CenterService,
    private keyboardService: MatKeyboardService,
    private auditService: AuditService,
    private dateAdapter: DateAdapter<Date>
  ) {
    this.subscribed = router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {        
        this.initializeComponent();
      }
    });
    this.initialLocationCode = this.appConfigService.getConfig()['countryCode'];
    this.locCode = this.appConfigService.getConfig()['locationHierarchyLevel'];
    
    this.disablePrimaryForm = true;
    this.disableSecondaryForm = true;
    
    //load all supported languages
    this.supportedLanguages = [];
    let self = this;
    let supportedLanguagesArr = this.appConfigService.getConfig()['supportedLanguages'].split(',');
    supportedLanguagesArr.map(function(lang){if(lang.trim()){self.supportedLanguages.push(lang.trim())}});

    let userPreferredLanguage = this.headerService.getUserPreferredLanguage();
    console.log(`constructor -- userPreferredLanguage: ${userPreferredLanguage}`);
    this.loadLanguages(userPreferredLanguage);
  }

  loadLanguages(primaryLangCode: string) {
    console.log(`loadLanguages: primary: ${primaryLangCode}`);
    // Set the primary language
    this.primaryLang = this.headerService.getUserPreferredLanguage();
    this.translateService.use(this.primaryLang);    
    //Set the "Select Language" dropdown options
    this.selectLanguagesArr = [];
    let self = this;
    let otherLangsArr = this.supportedLanguages.filter(function(lang){if(lang.trim() && lang.trim() !== self.primaryLang.trim()){return lang.trim()}}); 
    console.log("otherLangsArr>>>"+otherLangsArr);
    if(otherLangsArr.length > 0){
      otherLangsArr.forEach((language) => {
        if (defaultJson.languages && defaultJson.languages[language]) {
          this.selectLanguagesArr.push({
            code: language,
            value: defaultJson.languages[language].nativeName,
          });
        }
      });
      //Set the secondary language
      this.secondaryLang = this.selectLanguagesArr[0]["code"];
      this.primaryLang === this.secondaryLang ? this.showSecondaryForm = false : this.showSecondaryForm = true;
    }else{
      this.showSecondaryForm = false;
      this.showSpinner = false;
    }
    //Set the keyboard mapping
    this.primaryKeyboard = defaultJson.keyboardMapping[this.primaryLang];
    this.secondaryKeyboard = defaultJson.keyboardMapping[this.secondaryLang];
    // Set the language orientation LTR or RTL
    this.isPrimaryLangRTL = false;
    this.isSecondaryLangRTL = false;
    if(this.appConfigService.getConfig()['rightToLeftOrientation']){      
      let allRTLLangs = this.appConfigService.getConfig()['rightToLeftOrientation'].split(',');
      let filteredList = allRTLLangs.filter(langCode => langCode == this.primaryLang);
      if (filteredList.length > 0) {
        this.isPrimaryLangRTL = true;
      }
      filteredList = allRTLLangs.filter(langCode => langCode == this.secondaryLang);
      if (filteredList.length > 0) {
        this.isSecondaryLangRTL = true;
      }
    }
    //load weekdays label in primary language
    //this.days = appConstants.days[this.primaryLang];
    //load secondary labels
    if(this.secondaryLang){
    this.translateService
      .getTranslation(this.secondaryLang)
      .subscribe(response => {
        this.secondaryLanguageLabels = response.center;
        //console.log(this.secondaryLanguageLabels);
      });
    }
    //load popup messages labels  
    this.translateService
      .getTranslation(this.primaryLang)
      .subscribe(response => {
        this.serverError = response.serverError;
        this.popupMessages = response.center.popupMessages;
      });
    //load all the dropdowns    
    //this.loadLocationData(this.initialLocationCode, 'region');      
    this.getProcessingTime();
    this.getTimeSlots();
    this.getLeafZoneData();
    this.getWorkingDays();
    this.getLocationHierarchyLevels();
    let localeId = defaultJson.languages[this.primaryLang].locale;
    this.setLocaleForDatePicker(localeId);
  }

  lessThanEqual(locCode, index){
    return index <= locCode;
  }

  initializeComponent() {
    console.log(`initializeComponent -- primaryLang: ${this.primaryLang}`);
    //this.translateService.use(this.primaryLang);
    this.activatedRoute.params.subscribe(params => {
      this.centerId = params.id;
      this.initializePrimaryForm();
      this.initializeCommonForm();
      this.initializeSecondaryForm();
      this.auditService.audit(8, centerSpecFile.auditEventIds[1], 'centers');
      this.filteredLanguages = this.supportedLanguages;
      this.getPrimaryPanelData(this.primaryLang);
    });    
  }

  setLocaleForDatePicker = (localeId) => {    
    this.dateAdapter.setLocale(localeId);
    let localeDtFormat = moment.localeData(localeId).longDateFormat('L');
    this.translateService.get('demographic.date_yyyy').subscribe((year: string) => {
      const yearLabel = year;
      this.translateService.get('demographic.date_mm').subscribe((month: string) => {
        const monthLabel = month;
        this.translateService.get('demographic.date_dd').subscribe((day: string) => {
          const dayLabel = day;
          if (localeDtFormat.indexOf("YYYY") != -1) {
            localeDtFormat = localeDtFormat.replace(/YYYY/g, yearLabel);
          }
          else if (localeDtFormat.indexOf("YY") != -1) {
            localeDtFormat = localeDtFormat.replace(/YY/g, yearLabel);
          }
          if (localeDtFormat.indexOf("MM") != -1) {
            localeDtFormat = localeDtFormat.replace(/MM/g, monthLabel);
          }
          else if (localeDtFormat.indexOf("M") != -1) {
            localeDtFormat = localeDtFormat.replace(/M/g, monthLabel);
          }
          if (localeDtFormat.indexOf("DD") != -1) {
            localeDtFormat = localeDtFormat.replace(/DD/g, dayLabel);
          }
          else if (localeDtFormat.indexOf("D") != -1) {
            localeDtFormat = localeDtFormat.replace(/D/g, dayLabel);
          }
          this.localeDtFormat = localeDtFormat;
        });  
      });  
    });
  }

  initializePrimaryForm() {
    this.primaryForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.maxLength(128)]],
      contactPerson: ['', [Validators.maxLength(128)]],
      addressLine1: ['', [Validators.required, Validators.maxLength(256)]],
      addressLine2: ['', [Validators.maxLength(256)]],
      addressLine3: ['', [Validators.maxLength(256)]]
    });
  }

  initializeSecondaryForm() {
    this.secondaryForm = this.formBuilder.group({
      selectLanguage: ['', [Validators.required]],
      name: ['', [Validators.required, Validators.maxLength(128)]],
      contactPerson: ['', [Validators.maxLength(128)]],
      addressLine1: ['', [Validators.required, Validators.maxLength(256)]],
      addressLine2: ['', [Validators.maxLength(256)]],
      addressLine3: ['', [Validators.maxLength(256)]],
    });
  }

  initializeCommonForm() {
    let regionReq = [], provinceReq = [], cityReq = [], laaReq = [], postalCodeReq = [];
    if (1 <= this.locCode) {
      regionReq = [Validators.required];
    } if(2 <= this.locCode) {
      provinceReq = [Validators.required];
    } if(3 <= this.locCode) {
      cityReq = [Validators.required];
    } if(4 <= this.locCode) {
      laaReq = [Validators.required];
    } if(5 <= this.locCode) {
      postalCodeReq = [Validators.required];
    }
    this.commonForm = this.formBuilder.group({
      centerTypeCode: ['', [Validators.required]],
      contactPhone: ['', [Validators.maxLength(16)]],
      longitude: [
        '',
        [Validators.required, Validators.maxLength(32), ValidateLatLong]
      ],
      latitude: [
        '',
        [Validators.required, Validators.maxLength(32), ValidateLatLong]
      ],
      region: ['', regionReq],
      province: ['', provinceReq],
      city: ['', cityReq],
      laa: ['', laaReq],
      postalCode: ['', postalCodeReq],
      zone: ['', [Validators.required]],
      holidayZone: ['', [Validators.required]],
      workingHours: [{ value: '', disabled: true }],
      noKiosk: [
        { value: 0},
        [Validators.required, Validators.min(0), ValidateKiosk]
      ],
      processingTime: ['', [Validators.required]],
      startTime: ['', [Validators.required]],
      endTime: ['', [Validators.required]],
      lunchStartTime: [''],
      lunchEndTime: [''],
      workingDays: [[], [Validators.required]],
      exceptionalHolidays: [[]],
      //isActive: [{ value: false}]
    });
  }

  get primary() {
    return this.primaryForm.controls;
  }

  get secondary() {
    return this.secondaryForm.controls;
  }

  get common() {
    return this.commonForm.controls;
  }

  getLeafZoneData() {
    this.dataStorageService
    .getLeafZoneData(this.primaryLang)
    .subscribe(response => {
      //console.log(response);
      this.dropDownValues.zone.primary = response.response;
      if (this.dropDownValues.zone.primary.length === 1) {
        this.commonForm.controls.zone.setValue(
          this.dropDownValues.zone.primary[0].code
        );
        this.commonForm.controls.zone.disable();
      }
    });
  }

  getWorkingDays(){
    this.dataStorageService
      .getWorkingDays(this.primaryLang)
      .subscribe(response => { 
        this.days = response["response"]["workingdays"]   
      });
  }

  async getPrimaryPanelData(languageCode: string) {
    this.disablePrimaryForm = true;
    console.log(`fetching data for ${languageCode}`);
    const filter = new FilterModel('id', 'equals', this.centerId);
    this.centerRequest.filters = [filter];
    this.centerRequest.languageCode = languageCode;
    this.centerRequest.sort = [];
    this.centerRequest.pagination = { pageStart: 0, pageFetch: 10 };
    let request = new RequestModel(
      appConstants.registrationCenterCreateId,
      null,
      this.centerRequest
    );
    this.data[0] = null;
    this.showSpinner = true;
    this.centerService.getRegistrationCentersDetails(request).subscribe(
      response => {
        if (response.response.data) {
          this.loadLanguages(languageCode);
          this.data[0] = response.response.data[0];
          this.initializeheader();
          this.setPrimaryFormValues();
          this.setCommonFormValues();
          this.disablePrimaryForm = false;
          if (this.showSecondaryForm) {
            this.secondaryForm.controls.selectLanguage.setValue(
              this.secondaryLang
            );
            this.disableSecondaryForm = true;            
            this.getSecondaryPanelData(this.secondaryLang);
          }
        } else {
          //data is not available in userPrefLanguage (login language)
          //so fetch in next available language
          this.disablePrimaryForm = false;
          let filter = this.filteredLanguages.filter(lang => lang != languageCode);
          this.filteredLanguages = filter;
          if (filter && filter.length > 0) {
            let newLanguageCode = filter[0];
            if (this.data[0] == null) {
              this.getPrimaryPanelData(newLanguageCode);
            }  
          }
        }
      },
      //error => this.showErrorPopup()
    );
  }

  async getSecondaryPanelData (language: string) {
    const filter = new FilterModel('id', 'equals', this.centerId);
    this.centerRequest.filters = [filter];
    this.centerRequest.languageCode = language;
    this.centerRequest.sort = [];
    this.centerRequest.pagination = { pageStart: 0, pageFetch: 10 };
    let request = new RequestModel(
      appConstants.registrationCenterCreateId,
      null,
      this.centerRequest
    );
    this.data[1] = null;
    this.centerService
      .getRegistrationCentersDetails(request)
      .subscribe(secondaryResponse => {
        if (secondaryResponse.response) {
          this.showUpdateButton = true;
          this.data[1] = secondaryResponse.response.data
            ? secondaryResponse.response.data[0]
            : null;
          this.setSecondaryFormValues();
          this.disableSecondaryForm = false;
          this.showSpinner = false;
        } else {
          this.showUpdateButton = false;
          this.disableSecondaryForm = false;
          this.showSpinner = false;       
          //this.showErrorPopup();
        }
      },
      //error => this.showErrorPopup()
      );     
  }
  
  showErrorPopup() {
    this.dialog
      .open(DialogComponent, {
        width: '650px',
        data: {
          case: 'MESSAGE',
          // tslint:disable-next-line:no-string-literal
          title: this.popupMessages['noData']['title'],
          message: this.popupMessages['noData']['message'],
          // tslint:disable-next-line:no-string-literal
          btnTxt: this.popupMessages['noData']['btnTxt']
        },
        disableClose: true
      })
      .afterClosed()
      .subscribe(() => {
        this.router.navigateByUrl(`admin/resources/centers/view`)
      });
  }

  handleChangeSecondaryLang = (fieldName: string) => {
    let selectedNewLangCode = this.secondaryForm.controls[fieldName].value;
    if (this.secondaryForm.touched) {
      if (this.secondaryForm.valid) {
        this.secondaryForm.controls["selectLanguage"].setValue(this.secondaryLang);
        //this.submitSecondaryPanel(selectedNewLangCode);
        this.submitSecondaryPanel();
      } 
      if (!this.secondaryForm.valid) {
        this.secondaryForm.controls["selectLanguage"].setValue(this.secondaryLang);
        for (const i in this.secondaryForm.controls) {
          if (this.secondaryForm.controls[i]) {
            this.secondaryForm.controls[i].markAsTouched();
          }
        }
      }
    }  
    else {
      this.reloadSecondaryFormWithNewLang(selectedNewLangCode);
    } 
  }

  reloadSecondaryFormWithNewLang = (selectedNewLangCode: string) => {
    this.secondaryLang = selectedNewLangCode;
    this.secondaryKeyboard = defaultJson.keyboardMapping[this.secondaryLang];
    this.secondaryForm.reset();
    for (const i in this.secondaryForm.controls) {
      if (this.secondaryForm.controls[i]) {
        this.secondaryForm.controls[i].markAsPristine();
      }
    }
    if (this.data && this.data.length > 1) {
      this.data[1] = null;
    }
    this.translateService
    .getTranslation(this.secondaryLang)
    .subscribe(response => {
      this.secondaryLanguageLabels = response.center;
    });
    this.initializeSecondaryForm();
    this.auditService.audit(8, centerSpecFile.auditEventIds[1], 'centers')
    this.secondaryForm.controls.selectLanguage.setValue(
      this.secondaryLang
    );
    this.isSecondaryLangRTL = false;
    let allRTLLangs = this.appConfigService.getConfig()['rightToLeftOrientation'].split(',');
    let filteredList = allRTLLangs.filter(langCode => langCode == this.secondaryLang);
    if (filteredList.length > 0) {
      this.isSecondaryLangRTL = true;
    }
    this.disableSecondaryForm = true;
    this.getSecondaryPanelData(this.secondaryLang);
  }

  setPrimaryFormValues() {
    this.primaryForm.controls.name.setValue(this.data[0].name);
    this.primaryForm.controls.contactPerson.setValue(
      this.data[0].contactPerson
    );
    this.primaryForm.controls.addressLine1.setValue(this.data[0].addressLine1);
    this.primaryForm.controls.addressLine2.setValue(this.data[0].addressLine2);
    this.primaryForm.controls.addressLine3.setValue(this.data[0].addressLine3);
  }

  setSecondaryFormValues() {
    if (this.data[1]) {
      this.secondaryForm.controls.name.setValue(
        this.data[1].name ? this.data[1].name : ''
      );
      this.secondaryForm.controls.contactPerson.setValue(
        this.data[1].contactPerson ? this.data[1].contactPerson : ''
      );
      this.secondaryForm.controls.addressLine1.setValue(
        this.data[1].addressLine1 ? this.data[1].addressLine1 : ''
      );
      this.secondaryForm.controls.addressLine2.setValue(
        this.data[1].addressLine2 ? this.data[1].addressLine2 : ''
      );
      this.secondaryForm.controls.addressLine3.setValue(
        this.data[1].addressLine3 ? this.data[1].addressLine3 : ''
      );
    }
  }

  setCommonFormValues() {
    let self = this;
    let commonData = this.data[0];
    this.commonForm.controls.centerTypeCode.setValue(
      commonData.centerTypeCode
    );  
    this.getRegistrationCenterTypes("",commonData.centerTypeCode);    
    this.getHolidayZoneData("",commonData.holidayLocationCode); 
    this.commonForm.controls.contactPhone.setValue(commonData.contactPhone);
    this.commonForm.controls.longitude.setValue(commonData.longitude);
    this.commonForm.controls.latitude.setValue(commonData.latitude);
    this.commonForm.controls.region.setValue(commonData.regionCode);
    this.commonForm.controls.province.setValue(commonData.provinceCode);
    this.commonForm.controls.city.setValue(commonData.cityCode);
    this.commonForm.controls.laa.setValue(commonData.administrativeZoneCode);
    this.commonForm.controls.postalCode.setValue(commonData.locationCode);
    this.commonForm.controls.zone.setValue(commonData.zoneCode);
    this.commonForm.controls.holidayZone.setValue(
      commonData.holidayLocationCode
    );
    this.commonForm.controls.workingHours.setValue(
      commonData.workingHours.split(':')[0]
    );
    this.commonForm.controls.noKiosk.setValue(commonData.numberOfKiosks);
    this.commonForm.controls.processingTime.setValue(
      Number(commonData.perKioskProcessTime.split(':')[1])
    );
    this.commonForm.controls.startTime.setValue(
      Utils.convertTimeTo12Hours(commonData.centerStartTime)
    );
    this.commonForm.controls.endTime.setValue(
      Utils.convertTimeTo12Hours(commonData.centerEndTime)
    );
    this.commonForm.controls.lunchStartTime.setValue(
      Utils.convertTimeTo12Hours(commonData.lunchStartTime)
    );
    this.commonForm.controls.lunchEndTime.setValue(
      Utils.convertTimeTo12Hours(commonData.lunchEndTime)
    );
    this.commonForm.controls.workingDays.setValue(commonData.workingNonWorkingDays ?
      this.reverseFormatWorkingDays(commonData.workingNonWorkingDays) : []); 
    //console.log("commonData.workingNonWorkingDays>>>"+JSON.stringify(commonData.workingNonWorkingDays)+"<<<this.commonForm.controls.workingDays.value>>>"+this.commonForm.controls.workingDays.value);
    this.commonForm.controls.exceptionalHolidays.setValue(
      commonData.exceptionalHolidayPutPostDto ? [...commonData.exceptionalHolidayPutPostDto] : []);
    //this.commonForm.controls.isActive.setValue(commonData.isActive);
    //this.loadLocationDropDownsForUpdate(commonData);
    this.validateAndLoadLunchStartTime();
    this.validateAndLoadLunchEndTime();
  }
  
  formatWorkingDays(selectedDays: string[]) {
    const obj = {};
    this.days.forEach(day => {
      if (selectedDays.indexOf(day.code) >= 0) {
        obj[day.code] = true;
      } else {
        obj[day.code] = false;
      }
    });
    return obj;
  }

  reverseFormatWorkingDays(days: any) {
    const keys = Object.keys(days);
    const selectedDays = [];
    keys.forEach(key => {
      if (days[key]) {
        selectedDays.push(key.trim());
      }
    });
    return selectedDays;
  }

  updatePrimaryPanelData() {
    this.createUpdate = true;
    const primaryObject = new CenterLangModel(
      this.primaryForm.controls.addressLine1.value,
      this.primaryForm.controls.addressLine2.value,
      this.primaryForm.controls.addressLine3.value,
      this.primaryForm.controls.contactPerson.value,
      this.primaryLang,
      this.primaryForm.controls.name.value,
      this.centerId
    );
    const primaryRequest = new RequestModel(
      appConstants.registrationCenterCreateId,
      null,
      primaryObject
    );
    this.dataStorageService
    .updateCenterLangData(primaryRequest)
    .subscribe(updateResponse => {
        if (!updateResponse.errors) {
          this.showMessage('update-success', primaryObject)
          .afterClosed()
          .subscribe(() => {
            this.router.navigateByUrl(`/admin/resources/centers/single-view/${this.centerId}`);
          });
      } else {
        this.showMessage('update-error', updateResponse);
      }
    });
  }

  updateSecondaryPanelData() {
    this.createUpdate = true;
    const secondaryObject = new CenterLangModel(
      this.secondaryForm.controls.addressLine1.value,
      this.secondaryForm.controls.addressLine2.value,
      this.secondaryForm.controls.addressLine3.value,
      this.secondaryForm.controls.contactPerson.value,
      this.secondaryLang,
      this.secondaryForm.controls.name.value,
      this.centerId
    );
    const secondaryRequest = new RequestModel(
      appConstants.registrationCenterCreateId,
      null,
      secondaryObject
    );
    this.dataStorageService
    .updateCenterLangData(secondaryRequest)
    .subscribe(updateResponse => {
        if (!updateResponse.errors) {
          this.showMessage('update-success', secondaryObject)
          .afterClosed()
          .subscribe(() => {
            this.router.navigateByUrl(`/admin/resources/centers/single-view/${this.centerId}`);
          });
      } else {
        this.showMessage('update-error', updateResponse);
      }
    });
  }
  updateCommonData() {
    console.log("this.commonForm.controls.workingDays.value>>>"+this.dynamicFieldValue[this.locationFieldNameList[this.locCode-1]]);
    console.log("this.commonForm.controls.workingDays.value>>>"+JSON.stringify(this.dynamicFieldValue));
    this.createUpdate = true;
    /*let locationCode = "";
    if (1 == this.locCode) {
      locationCode = this.commonForm.controls.region.value;
    } else if (2 == this.locCode) {
      locationCode = this.commonForm.controls.province.value;
    } else if (3 == this.locCode) {
      locationCode = this.commonForm.controls.city.value;
    } else if (4 == this.locCode) {
      locationCode = this.commonForm.controls.laa.value;
    } else if (5 == this.locCode) {
      locationCode = this.commonForm.controls.postalCode.value;
    }*/
    const nonLangFieldsObject = new CenterNonLangModel(
      Utils.convertTime(this.commonForm.controls.endTime.value),
      Utils.convertTime(this.commonForm.controls.startTime.value),
      this.commonForm.controls.centerTypeCode.value,
      this.commonForm.controls.contactPhone.value,
      this.commonForm.controls.holidayZone.value,
      this.commonForm.controls.latitude.value,
      this.dynamicFieldValue[this.locationFieldNameList[this.locCode-1]],
      this.commonForm.controls.longitude.value,
      Utils.convertTime(this.commonForm.controls.lunchEndTime.value),
      Utils.convertTime(this.commonForm.controls.lunchStartTime.value),
      '00:' + this.commonForm.controls.processingTime.value + ':00',
      this.data[0].timeZone,
      this.commonForm.controls.workingHours.value,
      this.commonForm.controls.zone.value,
      this.centerId,
      this.commonForm.controls.noKiosk.value,
      this.formatWorkingDays(this.commonForm.controls.workingDays.value),
      this.commonForm.controls.exceptionalHolidays.value,
    );

    const request = new RequestModel(
      appConstants.registrationCenterCreateId,
      null,
      nonLangFieldsObject
    );
    this.dataStorageService.updateCenterNonLangData(request).subscribe(updateResponse => {
      if (!updateResponse.errors || updateResponse.errors.length === 0) {
        if (this.data[0] != null) {
          nonLangFieldsObject["name"] = this.data[0].name;
        }
        this.showMessage('update-success', nonLangFieldsObject)
        .afterClosed()
        .subscribe(() => {
          this.router.navigateByUrl(`/admin/resources/centers/single-view/${this.centerId}`);
        });
      } else {
        this.showMessage('update-error', updateResponse);
      }
    });
  }

  showMessage(type: string, data?: any) {
    let message = "";
    if(type === 'create-success' || type === 'update-success'){
      message = this.popupMessages[type].message[0] + data.id + this.popupMessages[type].message[1] + data.name;
    }else{
      if(data.errors[0].errorCode === "KER-MSD-999"){
        data.errors.forEach((element) => {
          message = message + element.message.toString() +"\n\n";
        });
        message = this.serverError[data.errors[0].errorCode] +"\n\n"+ message;
      }else{
        message = this.serverError[data.errors[0].errorCode];
      }
    }
    const dialogRef = this.dialog.open(DialogComponent, {
      width: '650px',
      data: {
        case: 'MESSAGE',
        title: this.popupMessages[type].title,
        message:message,
        btnTxt: this.popupMessages[type].btnTxt
      }
    });
    return dialogRef;
  }


  initializeheader() {
    if (this.data.length === 0) {
      this.headerObject = new HeaderModel('-', '-', '-', '-', '-', '-', '-');
    } else {
      this.headerObject = new HeaderModel(
        this.data[0].name,
        this.data[0].createdDateTime ? this.data[0].createdDateTime : '-',
        this.data[0].createdBy ? this.data[0].createdBy : '-',
        this.data[0].updatedDateTime ? this.data[0].updatedDateTime : '-',
        this.data[0].updatedBy ? this.data[0].updatedBy : '-',
        this.data[0].id,
        this.data[0].isActive
      );
    }
  }

  naviagteBack() {
    this.location.back();
  }

  resetLocationFields(fieldName: string) {
    const locationFields = ['region', 'province', 'city', 'laa', 'postalCode', 'zone'];
    const index = locationFields.indexOf(fieldName);
    for (let i = index; i < locationFields.length; i++) {
      this.commonForm.controls[locationFields[i]].setValue('');
      this.commonForm.controls[locationFields[i]].markAsUntouched();
    }
  }

  /*loadLocationData(locationCode: string, fieldName: string) {
    if (fieldName !== 'region' && !this.disablePrimaryForm) {
      this.resetLocationFields(fieldName);
    }
    this.dataStorageService
      .getImmediateChildren(locationCode, this.primaryLang)
      .subscribe(response => {
        this.dropDownValues[fieldName].primary =
          response['response']['locations'];
      });
  }*/

  loadLocationDropDownsDynamicallyForUpdate() {  
    if(this.locationFieldNameList && this.data[0]) 
      for (let i = 0; i < this.locationFieldNameList.length; i++) {
        this.loadLocationDataDynamically({"value":this.data[0].location[i+1]}, i);
        if(this.data[0])
          this.dynamicFieldValue[this.locationFieldNameList[i]] = this.data[0].location[i+1];
      }
  }

  loadLocationDataDynamically(event:any, index: any){
    let locationCode = ""; 
    let fieldName = "";   
    let self = this;  
    if(event === ""){
      fieldName = this.locationFieldNameList[parseInt(index)];
      locationCode = this.initialLocationCode;
    }else{    
      fieldName = this.locationFieldNameList[parseInt(index)+1];
      locationCode = event.value; 
      this.dynamicFieldValue[this.locationFieldNameList[parseInt(index)]] = event.value;
    }    
    this.dataStorageService
    .getImmediateChildren(locationCode, this.primaryLang)
    .subscribe(response => {
      if(response['response'])
        self.dynamicDropDown[fieldName] = response['response']['locations'];
    });    
  }

  submitPrimaryPanel() {
    if (!this.disablePrimaryForm) {
      this.auditService.audit(17, 'ADM-097');
      if (this.primaryForm.valid) {
        let data = {
          case: 'CONFIRMATION',
          title: this.popupMessages['edit'].title,
          message: this.popupMessages['edit'].message,
          yesBtnTxt: this.popupMessages['edit'].yesBtnText,
          noBtnTxt: this.popupMessages['edit'].noBtnText
        };
        const dialogRef = this.dialog.open(DialogComponent, {
          width: '650px',
          data
        });
        dialogRef.afterClosed().subscribe(response => {
          if (response) {
            this.auditService.audit(18, 'ADM-105', 'edit');
            this.updatePrimaryPanelData();
          } else if (!response) {
            this.auditService.audit(19, 'ADM-107', 'edit');
          }
        });
      } else {
        for (const i in this.primaryForm.controls) {
          if (this.primaryForm.controls[i]) {
            this.primaryForm.controls[i].markAsTouched();
          }
        }
      }
    } else {
      this.disablePrimaryForm = false;
      this.primaryForm.enable();
    }
  }

  submitSecondaryPanel() {
    if (!this.disableSecondaryForm) {
      this.auditService.audit(17, 'ADM-097');
      if (this.secondaryForm.valid) {
        let data = {};
        if (this.data.length > 1 && this.data[1] == null) {
          let selectedZone = this.data[0].zoneCode;
          const zone = this.dropDownValues.zone.primary.filter(z => z.code === selectedZone);
          data = {
            case: 'CONFIRMATION',
            title: this.popupMessages['create'].title,
            message: this.popupMessages['create'].message[0] + zone[0].name + this.popupMessages['create'].message[1],
            yesBtnTxt: this.popupMessages['create'].yesBtnText,
            noBtnTxt: this.popupMessages['create'].noBtnText
          };
        } else {
          data = {
            case: 'CONFIRMATION',
            title: this.popupMessages['edit'].title,
            message: this.popupMessages['edit'].message,
            yesBtnTxt: this.popupMessages['edit'].yesBtnText,
            noBtnTxt: this.popupMessages['edit'].noBtnText
          };
        }
        const dialogRef = this.dialog.open(DialogComponent, {
          width: '650px',
          data
        });
        dialogRef.afterClosed().subscribe(response => {
          if (response && this.data.length > 1 && this.data[1] == null) {
            this.auditService.audit(18, 'ADM-104', 'create');
            this.updateSecondaryPanelData();
          } else if (response && this.data.length > 1 && this.data[1] !== null) {
            this.auditService.audit(18, 'ADM-105', 'edit');
            this.updateSecondaryPanelData();
          } else if (!response && this.data.length > 1 && this.data[1] == null) {
            this.auditService.audit(19, 'ADM-106', 'create');
          } else if (!response && this.data.length > 1 && this.data[1] !== null) {
            this.auditService.audit(19, 'ADM-107', 'edit');
          }
        });
      } else {
        for (const i in this.secondaryForm.controls) {
          if (this.secondaryForm.controls[i]) {
            this.secondaryForm.controls[i].markAsTouched();
          }
        }
      }
    } else {
      this.disableSecondaryForm = false;
      if (this.showSecondaryForm) {
        this.initializeSecondaryForm();
        this.setSecondaryFormValues();
      }
    }
  }

  submitCommonPanel() {
    if (!this.disablePrimaryForm) {
      this.auditService.audit(17, 'ADM-097');
      if (this.commonForm.valid) {
        let data = {
          case: 'CONFIRMATION',
          title: this.popupMessages['edit'].title,
          message: this.popupMessages['edit'].message,
          yesBtnTxt: this.popupMessages['edit'].yesBtnText,
          noBtnTxt: this.popupMessages['edit'].noBtnText
        };
        const dialogRef = this.dialog.open(DialogComponent, {
          width: '650px',
          data
        });
        dialogRef.afterClosed().subscribe(response => {
          if (response) {
            this.auditService.audit(18, 'ADM-105', 'edit');
            this.updateCommonData();
          } else if (!response) {
            this.auditService.audit(19, 'ADM-107', 'edit');
          }
        });
      } else {
        for (const i in this.commonForm.controls) {
          if (this.commonForm.controls[i]) {
            this.commonForm.controls[i].markAsTouched();
          }
        }
      }
    } else {
      this.disablePrimaryForm = false;
      this.commonForm.enable();
      this.commonForm.controls.noKiosk.enable();
      //this.commonForm.controls.isActive.enable();
    }
  }

  getHolidayZoneData(filterValue, fillValue) {
    let filterObject = new FilterValuesModel('locationCode', 'unique', '');
    let optinalFilterObject = new OptionalFilterValuesModel('isActive', 'equals', 'true');
    let filterValueObject = {};
    let optinalFilterArray = [];
    optinalFilterArray.push(optinalFilterObject);
    if(filterValue)
      filterValueObject = {"columnName":"locationCode","type":"contains","value":filterValue}
      optinalFilterArray.push(filterValueObject);
    if(fillValue)
      filterValueObject = {"columnName":"locationCode","type":"equals","value":fillValue}
      optinalFilterArray.push(filterValueObject);          
    let filterRequest = new FilterRequest([filterObject], this.primaryLang, optinalFilterArray);
    let request = new RequestModel('', null, filterRequest);
    this.dataStorageService.getStubbedDataForDropdowns(request).subscribe(response => {
      if (response.response.filters) {
        this.dropDownValues.holidayZone.primary = response.response.filters;
      }
    });
  }

  getLocationHierarchyLevels() {
    let self = this;
    let fieldNameData = {};
    self.locationFieldNameList = [];
    self.dataStorageService.getLocationHierarchyLevels(self.primaryLang).subscribe(response => {
      response.response.locationHierarchyLevels.forEach(function (value) {
        if(value.hierarchyLevel != 0)
          if(value.hierarchyLevel <= self.locCode)
            self.locationFieldNameList.push(value.hierarchyLevelName);          
      });  
      for(let value of self.locationFieldNameList) {
        self.dynamicDropDown[value] = []; 
        self.dynamicFieldValue[value] = "";
      }
      self.loadLocationDataDynamically("", 0);
      self.loadLocationDropDownsDynamicallyForUpdate();
      //self.loadLocationData(self.initialLocationCode, 'region');     
    }); 
  }

  getRegistrationCenterTypes(filterValue, fillValue) {
    let filterObject = new FilterValuesModel('name', 'unique', '');
    let optinalFilterObject = new OptionalFilterValuesModel('isActive', 'equals', 'true');
    let filterValueObject = {};
    let optinalFilterArray = [];
    optinalFilterArray.push(optinalFilterObject);
    if(filterValue)
      filterValueObject = {"columnName":"name","type":"contains","value":filterValue}
      optinalFilterArray.push(filterValueObject);    
    if(fillValue)
      filterValueObject = {"columnName":"code","type":"equals","value":fillValue}
      optinalFilterArray.push(filterValueObject);            
    let filterRequest = new FilterRequest([filterObject], this.primaryLang, optinalFilterArray);
    let request = new RequestModel('', null, filterRequest);
    this.dataStorageService
      .getFiltersForAllMaterDataTypes('registrationcentertypes', request)
      .subscribe(response => {
        this.dropDownValues.centerTypeCode.primary = response.response.filters;
      });
  }

  onKey(value, type) {     
    let filter = value.toLowerCase();
    if(type === "centertype"){
      this.getRegistrationCenterTypes(filter, "");
    }else if(type === "holiday"){
      this.getHolidayZoneData(filter, "");
    }    
  }

  getProcessingTime() {
    this.dropDownValues.processingTime = Utils.minuteIntervals(
      appConstants.processingTimeStart,
      appConstants.processingTimeEnd,
      appConstants.processingTimeInterval
    );
  }

  getTimeSlots() {
    const slots = Utils.getTimeSlots(appConstants.timeSlotsInterval);
    this.dropDownValues.startTime = slots;
    this.dropDownValues.endTime = slots;
    this.allSlots = slots;
  }

  calculateWorkingHours() {
    if (
      this.commonForm.controls.startTime.value &&
      this.commonForm.controls.endTime.value
    ) {
      const x =
        Utils.getTimeInSeconds(this.commonForm.controls.endTime.value) -
        Utils.getTimeInSeconds(this.commonForm.controls.startTime.value);
      this.commonForm.controls.workingHours.setValue(x / 3600);
      this.commonForm.controls.lunchStartTime.setValue('');
      this.commonForm.controls.lunchEndTime.setValue('');
      this.dropDownValues.lunchStartTime = [];
      this.dropDownValues.lunchEndTime = [];
    }
  }

  updateTimeSlotDropdownOptions(
    changedField: string,
    targetField: string,
    action: string
  ) {
    const x = [...this.allSlots];
    const index = x.indexOf(this.commonForm.controls[changedField].value);
    if (action === 'more') {
      this.dropDownValues[targetField] = x.splice(index + 1);
    } else if (action === 'less') {
      this.dropDownValues[targetField] = x.splice(0, index + 1);
    }
  }

  validateAndLoadLunchStartTime() {
    if (this.commonForm.controls.startTime.value !== "" && this.commonForm.controls.startTime.valid) {
      const x = [...this.allSlots];
      let startIndex = x.indexOf(this.commonForm.controls.startTime.value) + 1;
      if (this.commonForm.controls.lunchStartTime.value != this.commonForm.controls.lunchEndTime.value 
        && this.commonForm.controls.lunchEndTime.value !== '' && this.commonForm.controls.lunchEndTime.valid) {
        const endIndex = x.indexOf(this.commonForm.controls.lunchEndTime.value);
        this.dropDownValues.lunchStartTime = x.slice(startIndex, endIndex);
      } else {
        const endIndex = x.indexOf(this.commonForm.controls.endTime.value);
        this.dropDownValues.lunchStartTime = x.slice(startIndex, endIndex);
      }
    }
    // else {
    //   this.dialog.open(DialogComponent, {
    //     data: {
    //       case: 'MESSAGE',
    //       title: this.popupMessages.lunchTimeValidation.title,
    //       message: this.popupMessages.lunchTimeValidation.message,
    //       btnTxt: this.popupMessages.lunchTimeValidation.btnTxt
    //     }
    //   });
    // } 
  }

  validateAndLoadLunchEndTime() {
    if (this.commonForm.controls.endTime.value !== "" && this.commonForm.controls.endTime.valid) {
      const x = [...this.allSlots];
      const endIndex = x.indexOf(this.commonForm.controls.endTime.value);
      if (this.commonForm.controls.lunchStartTime.value != this.commonForm.controls.lunchEndTime.value 
        && this.commonForm.controls.lunchStartTime.value !== '' && this.commonForm.controls.lunchStartTime.valid) {
        const startIndex = x.indexOf(this.commonForm.controls.lunchStartTime.value) + 1;
        this.dropDownValues.lunchEndTime = x.slice(startIndex, endIndex);  
      } else {
        const startIndex = x.indexOf(this.commonForm.controls.startTime.value) + 1;
        this.dropDownValues.lunchEndTime = x.slice(startIndex, endIndex);
      } 
    }
    // else {
    //   this.dialog.open(DialogComponent, {
    //     data: {
    //       case: 'MESSAGE',
    //       title: this.popupMessages.lunchTimeValidation.title,
    //       message: this.popupMessages.lunchTimeValidation.message,
    //       btnTxt: this.popupMessages.lunchTimeValidation.btnTxt
    //     }
    //   });
    // }
  }

  cancel() {
    this.location.back();
  }

  /*loadLocationDropDownsForUpdate(data: any) {
    if (1 <= this.locCode) {
      this.loadLocationData(this.initialLocationCode, 'region');
    } if(2 <= this.locCode) {
      this.loadLocationData(data.regionCode, 'province');
    } if(3 <= this.locCode) {
      this.loadLocationData(data.provinceCode, 'city');
    } if(4 <= this.locCode) {
      this.loadLocationData(data.cityCode, 'laa');
    } if(5 <= this.locCode) {
      this.loadLocationData(data.administrativeZoneCode, 'postalCode');
    }
  }*/

  scrollPage(
    element: HTMLElement,
    type: string,
    formControlName: string,
    index: number
  ) {
    element.scrollIntoView({ block: 'center', inline: 'nearest' });
    this.selectedField = element;
    if (this.keyboardRef) {
      this.keyboardRef.instance.setInputInstance(
        this.attachToElementMesOne._results[index]
      );
      if (type === 'primary') {
        this.keyboardRef.instance.attachControl(
          this.primaryForm.controls[formControlName]
        );
      } else if (type === 'secondary') {
        this.keyboardRef.instance.attachControl(
          this.secondaryForm.controls[formControlName]
        );
      }
    }
  }

  openKeyboard(type: string) {
    if (this.keyboardService.isOpened && this.keyboardType === type) {
      this.keyboardService.dismiss();
      this.keyboardRef = undefined;
    } else {
      this.keyboardType = type;
      if (type === 'primary') {
        this.keyboardRef = this.keyboardService.open(this.primaryKeyboard);
      } else if (type === 'secondary') {
        this.keyboardRef = this.keyboardService.open(this.secondaryKeyboard);
      }
      if (this.selectedField) {
        this.selectedField.focus();
      }
    }
  }

  createExceptionalHoliday() {
    if (this.holidayDate) {
      const existingHolidays = this.commonForm.controls.exceptionalHolidays.value;
      const holidayObj = new HolidayModel(Utils.formatDate(this.holidayDate));
      const x = existingHolidays.filter(holiday => holiday.exceptionHolidayDate === holidayObj.exceptionHolidayDate);
      if (x.length === 0) {
        existingHolidays.push(holidayObj);
        this.commonForm.controls.exceptionalHolidays.setValue(existingHolidays);
      }
      this.holidayDate = undefined;
    }
  }

  deleteHoliday(i: number) {
    if (!this.disablePrimaryForm) {
      let existingHolidays = this.commonForm.controls.exceptionalHolidays.value;
      existingHolidays.splice(i, 1);
      this.commonForm.controls.exceptionalHolidays.setValue(existingHolidays);
    }
  }

  canDeactivate(): Observable<any> | boolean {
    if (this.keyboardService.isOpened) {
      this.keyboardService.dismiss();
    }
    this.subscribed.unsubscribe();
    if (
      (this.primaryForm.touched || this.secondaryForm.touched || this.commonForm.touched) &&
      !this.createUpdate
    ) {
      return this.dialog
        .open(DialogComponent, {
          width: '650px',
          data: {
            case: 'CONFIRMATION',
            title: this.popupMessages['navigation-popup'].title,
            message: this.popupMessages['navigation-popup'].message,
            yesBtnTxt: this.popupMessages['navigation-popup'].yesBtnTxt,
            noBtnTxt: this.popupMessages['navigation-popup'].noBtnTxt
          }
        })
        .afterClosed();
    } else {
      return true;
    }
  }

}

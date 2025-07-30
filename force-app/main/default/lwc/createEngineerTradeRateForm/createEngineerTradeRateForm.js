import { LightningElement, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getActiveEngineers from '@salesforce/apex/EngineerTradeRateHelper.getActiveEngineers';
import getTradePicklistValues from '@salesforce/apex/EngineerTradeRateHelper.getTradePicklistValues';
import getTierPicklistValues from '@salesforce/apex/EngineerTradeRateHelper.getTierPicklistValues';
import createTradeRateRecords from '@salesforce/apex/EngineerTradeRateHelper.createTradeRateRecords';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class CreateEngineerTradeRateForm extends NavigationMixin(LightningElement) {
    @track engineerOptions = [];
    @track tradeOptions = [];
    @track tierOptions = [];

    @track selectedEngineer = '';
    @track selectedTrades = [];
    @track selectedTier = '';
    @track error = '';

    @track engineerClass = '';
    @track tierClass = '';
    @track tradeError = false;

    get tradeBoxWrapperClass() {
        return this.tradeError ? 'trade-error-border' : '';
    }

    get engineerComboboxClass() {
        return this.engineerClass ? 'slds-has-error' : '';
    }

    get tierComboboxClass() {
        return this.tierClass ? 'slds-has-error' : '';
    }

    connectedCallback() {
        this.loadEngineers();
        this.loadTrades();
        this.loadTiers();
    }

    loadEngineers() {
        getActiveEngineers().then(result => {
            this.engineerOptions = result.map(e => ({ label: e.Name, value: e.Id }));
        }).catch(error => {
            console.error('Error loading engineers:', error);
        });
    }

    loadTrades() {
        getTradePicklistValues().then(result => {
            this.tradeOptions = result.map(t => ({ label: t, value: t }));
        }).catch(error => {
            console.error('Error loading trades:', error);
        });
    }

    loadTiers() {
        getTierPicklistValues().then(result => {
            this.tierOptions = result.map(t => ({ label: t.label, value: t.value }));
        }).catch(error => {
            console.error('Error loading tiers:', error);
        });
    }

    handleEngineerChange(event) {
        this.selectedEngineer = event.detail.value;
        this.engineerClass = '';
    }

    handleTradeChange(event) {
        this.selectedTrades = event.detail.value;
        this.tradeError = false;
    }

    handleTierChange(event) {
        this.selectedTier = event.detail.value;
        this.tierClass = '';
    }

    handleCreate() {
        this.error = '';
        this.resetFieldClasses();

        let hasError = false;

        if (!this.selectedEngineer) {
            this.engineerClass = 'slds-has-error';
            hasError = true;
        }

        if (!this.selectedTrades || this.selectedTrades.length === 0) {
            this.tradeError = true;
            hasError = true;
        }

        if (!this.selectedTier) {
            this.tierClass = 'slds-has-error';
            hasError = true;
        }

        if (hasError) {
            this.error = 'Please complete the highlighted fields.';
            return;
        }

        createTradeRateRecords({
            engineerId: this.selectedEngineer,
            trades: this.selectedTrades.join(';'),
            tierOfPay: this.selectedTier
        })
        .then(result => {
            if (result.startsWith('Error')) {
                this.error = result;
                
                // Show red borders on specific fields based on error type
                if (result.includes('already exists in Tier') || result.includes('different Tier')) {
                    // If engineer has existing trades in different tiers, highlight engineer and tier fields
                    this.engineerClass = 'slds-has-error';
                    this.tierClass = 'slds-has-error';
                    this.tradeError = true;
                } else if (result.includes('already exists in the selected Tier')) {
                    // If trades already exist in the same tier, highlight trades and tier
                    this.tradeError = true;
                    this.tierClass = 'slds-has-error';
                } else if (result.includes('already')) {
                    // General case for any "already exists" error
                    this.tradeError = true;
                }
            } else {
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Success',
                    message: 'Records created successfully!',
                    variant: 'success'
                }));
                this.resetForm();
                this.handleClose();
            }
        })
        .catch(error => {
            this.error = 'Unexpected error occurred.';
            this.tradeError = true;
            console.error('Apex error:', error);
        });
    }

    handleClose() {
        this.resetForm();
        this[NavigationMixin.Navigate]({
            type: 'standard__objectPage',
            attributes: {
                objectApiName: 'Engineer_Trade_Rate__c',
                actionName: 'list'
            },
            state: {
                filterName: 'Recent'
            }
        });
    }

    resetForm() {
        this.selectedEngineer = '';
        this.selectedTrades = [];
        this.selectedTier = '';
        this.resetFieldClasses();
        this.error = '';
    }

    resetFieldClasses() {
        this.engineerClass = '';
        this.tierClass = '';
        this.tradeError = false;
    }
}
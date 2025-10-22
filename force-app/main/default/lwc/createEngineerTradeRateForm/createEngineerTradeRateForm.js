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
                
                // Show red border only on Trade field for all error types
                if (result.includes('already exists in Tier') || 
                    result.includes('different Tier') || 
                    result.includes('already exists in the selected Tier') || 
                    result.includes('already')) {
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
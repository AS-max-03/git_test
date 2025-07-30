public with sharing class EngineerTradeRateHelper {
    @AuraEnabled(cacheable=true)
    public static List<ServiceResource> getActiveEngineers() {
        return [SELECT Id, Name FROM ServiceResource WHERE IsActive = true];
    }
    
    @AuraEnabled(cacheable=true)
    public static List<String> getTradePicklistValues() {
        List<String> tradeValues = new List<String>();
        Schema.DescribeFieldResult fieldResult = Engineer_Trade_Rate__c.Trade__c.getDescribe();
        for (Schema.PicklistEntry entry : fieldResult.getPicklistValues()) {
            if (entry.isActive()) {
                tradeValues.add(entry.getLabel());
            }
        }
        return tradeValues;
    }
    
    @AuraEnabled(cacheable=true)
    public static List<Map<String, String>> getTierPicklistValues() {
        List<Map<String, String>> options = new List<Map<String, String>>();
        Schema.DescribeFieldResult fieldResult = Engineer_Trade_Rate__c.Tier_of_Pay__c.getDescribe();
        
        for (Schema.PicklistEntry entry : fieldResult.getPicklistValues()) {
            if (entry.isActive()) {
                options.add(new Map<String, String>{
                    'label' => entry.getLabel(),
                    'value' => entry.getValue() 
                });
            }
        }
        return options;
    }
    
    @AuraEnabled
    public static String createTradeRateRecords(Id engineerId, String trades, String tierOfPay) {
        try {
            List<String> newTrades = new List<String>();
            for (String t : trades.split(';')) {
                newTrades.add(t.trim());
            }
            
            // Check for trades that exist in different tiers
            List<Engineer_Trade_Rate__c> duplicates = [
                SELECT Id, Trade__c, Tier_of_Pay__c
                FROM Engineer_Trade_Rate__c
                WHERE Service_Resource__c = :engineerId
                AND Tier_of_Pay__c != :tierOfPay
                AND Trade__c IN :newTrades
            ];
            if (!duplicates.isEmpty()) {
                List<String> errorDetails = new List<String>();
                for (Engineer_Trade_Rate__c rec : duplicates) {
                    errorDetails.add('Trade "' + rec.Trade__c + '" already exists in Tier "' + rec.Tier_of_Pay__c + '"');
                }
                return 'Error: ' + String.join(errorDetails, '; ');
            }
            
            // Check for trades that already exist in the same tier
            List<Engineer_Trade_Rate__c> sameTier = [
                SELECT Id, Trade__c
                FROM Engineer_Trade_Rate__c
                WHERE Service_Resource__c = :engineerId
                AND Tier_of_Pay__c = :tierOfPay
                AND Trade__c IN :newTrades
            ];
            
            if (!sameTier.isEmpty()) {
                List<String> errorDetails = new List<String>();
                for (Engineer_Trade_Rate__c rec : sameTier) {
                    errorDetails.add('Trade "' + rec.Trade__c + '" already exists in the selected Tier "' + tierOfPay + '"');
                }
                return 'Error: ' + String.join(errorDetails, '; ');
            }
            
            // Create new records
            List<Engineer_Trade_Rate__c> toInsert = new List<Engineer_Trade_Rate__c>();
            for (String trade : newTrades) {
                toInsert.add(new Engineer_Trade_Rate__c(
                    Service_Resource__c = engineerId,
                    Trade__c = trade,
                    Tier_of_Pay__c = tierOfPay
                ));
            }
            insert toInsert;
            return 'Success';
        } 
        catch (Exception e) {
            return 'Error inserting records: ' + e.getMessage();
        }
    }
    
    @AuraEnabled(cacheable=true)
    public static List<String> getExistingTiers(Id engineerId) {
        Set<String> tiers = new Set<String>();
        for (Engineer_Trade_Rate__c rec : [
            SELECT Tier_of_Pay__c FROM Engineer_Trade_Rate__c
            WHERE Service_Resource__c  = :engineerId
        ]) {
            if (rec.Tier_of_Pay__c != null) {
                tiers.add(rec.Tier_of_Pay__c);
            }
        }
        return new List<String>(tiers);
    }
    
    @AuraEnabled(cacheable=true)
    public static List<String> getSelectedTrades(Id engineerId, String tierOfPay) {
        List<String> trades = new List<String>();
        for (Engineer_Trade_Rate__c rec : [
            SELECT Trade__c FROM Engineer_Trade_Rate__c
            WHERE Service_Resource__c  = :engineerId AND Tier_of_Pay__c = :tierOfPay
        ]) {
            trades.add(rec.Trade__c);
        }
        return trades;
    }
    
    @AuraEnabled
    public static String updateTradeRateRecords(Id engineerId, String updatesJson) {
        try {
            List<Object> rawList = (List<Object>) JSON.deserializeUntyped(updatesJson);
            List<Engineer_Trade_Rate__c> toUpdate = new List<Engineer_Trade_Rate__c>();
            
            for (Object obj : rawList) {
                Map<String, Object> row = (Map<String, Object>) obj;
                String trade = (String) row.get('trade');
                String newTier = (String) row.get('tier');
                
                List<Engineer_Trade_Rate__c> existing = [
                    SELECT Id, Tier_of_Pay__c
                    FROM Engineer_Trade_Rate__c
                    WHERE Service_Resource__c = :engineerId AND Trade__c = :trade
                    LIMIT 1
                ];
                
                if (!existing.isEmpty()) {
                    Engineer_Trade_Rate__c record = existing[0];
                    record.Tier_of_Pay__c = newTier;
                    toUpdate.add(record);
                }
            }
            if (!toUpdate.isEmpty()) {
                update toUpdate;
            }
            return 'Success';
        } catch (Exception e) {
            return 'Error: ' + e.getMessage();
        }
    }
    
    @AuraEnabled(cacheable=true)
    public static List<Map<String, String>> getAllTradeTiersForEngineer(Id engineerId) {
        List<Map<String, String>> result = new List<Map<String, String>>();
        for (Engineer_Trade_Rate__c rec : [
            SELECT Trade__c, Tier_of_Pay__c
            FROM Engineer_Trade_Rate__c
            WHERE Service_Resource__c = :engineerId
        ]) {
            result.add(new Map<String, String>{
                'trade' => rec.Trade__c,
                'tier' => rec.Tier_of_Pay__c
            });
        }
        return result;
    }
    
    @AuraEnabled(cacheable=true)
    public static List<String> getTierPicklistValuess() {
        List<String> options = new List<String>();
        Schema.DescribeFieldResult fieldResult = Engineer_Trade_Rate__c.Tier_of_Pay__c.getDescribe();
        for (Schema.PicklistEntry entry : fieldResult.getPicklistValues()) {
            options.add(entry.getValue());
        }
        return options;
    }
}
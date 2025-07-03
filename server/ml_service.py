#!/usr/bin/env python3
"""
ML Service for Anomaly Detection and LIME Explanations
Handles Isolation Forest, Local Outlier Factor, and LIME interpretability
"""

import json
import sys
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.neighbors import LocalOutlierFactor
from sklearn.preprocessing import StandardScaler
from lime.lime_tabular import LimeTabularExplainer
import warnings
warnings.filterwarnings('ignore')

class MLAnomalyDetector:
    def __init__(self):
        self.scaler = StandardScaler()
        self.iso_forest = None
        self.lof = None
        self.lime_explainer = None
        self.feature_names = []
        self.data = None
        self.scaled_data = None
        
    def preprocess_data(self, raw_data):
        """Preprocess the data for ML analysis"""
        # Convert to DataFrame
        df = pd.DataFrame(raw_data)
        
        # Select numeric features for ML analysis
        numeric_features = [
            'taxableIncome', 'salary', 'revenue', 
            'amountTaxable', 'bubblegumTax', 'confectionarySalesTaxPercent'
        ]
        
        # Create feature matrix
        feature_data = []
        for _, row in df.iterrows():
            feature_row = []
            for feature in numeric_features:
                value = row.get(feature)
                if value is None or value == '':
                    feature_row.append(0.0)
                else:
                    # Convert string values to float
                    try:
                        if isinstance(value, str):
                            # Remove currency symbols and commas
                            clean_value = value.replace('$', '').replace(',', '')
                            feature_row.append(float(clean_value))
                        else:
                            feature_row.append(float(value))
                    except (ValueError, TypeError):
                        feature_row.append(0.0)
            feature_data.append(feature_row)
        
        # Create feature matrix
        X = np.array(feature_data)
        
        # Store original data and feature names
        self.data = df
        self.feature_names = numeric_features
        
        # Scale the features
        self.scaled_data = self.scaler.fit_transform(X)
        
        return X, self.scaled_data
    
    def run_isolation_forest(self, contamination=0.1):
        """Run Isolation Forest anomaly detection"""
        self.iso_forest = IsolationForest(
            contamination=contamination,
            random_state=42,
            n_estimators=100
        )
        
        # Fit and predict
        iso_predictions = self.iso_forest.fit_predict(self.scaled_data)
        iso_scores = self.iso_forest.decision_function(self.scaled_data)
        
        # Convert to anomaly indicators (1 = anomaly, 0 = normal)
        iso_anomalies = (iso_predictions == -1).astype(int)
        
        return iso_anomalies, iso_scores
    
    def run_local_outlier_factor(self, n_neighbors=20, contamination=0.1):
        """Run Local Outlier Factor anomaly detection"""
        self.lof = LocalOutlierFactor(
            n_neighbors=n_neighbors,
            contamination=contamination,
            novelty=False
        )
        
        # Fit and predict
        lof_predictions = self.lof.fit_predict(self.scaled_data)
        lof_scores = self.lof.negative_outlier_factor_
        
        # Convert to anomaly indicators (1 = anomaly, 0 = normal)
        lof_anomalies = (lof_predictions == -1).astype(int)
        
        return lof_anomalies, lof_scores
    
    def setup_lime_explainer(self, X, explanation_type='discretized'):
        """Setup LIME explainer for interpretability"""
        if explanation_type == 'raw':
            # Raw feature names without discretization
            self.lime_explainer = LimeTabularExplainer(
                X,
                feature_names=self.feature_names,
                mode='classification',
                class_names=['Normal', 'Anomaly'],
                discretize_continuous=False
            )
        elif explanation_type == 'percentile':
            # Percentile-based feature names
            percentile_names = []
            for i, feature in enumerate(self.feature_names):
                feature_values = X[:, i]
                percentiles = np.percentile(feature_values, [25, 50, 75, 90, 95])
                percentile_names.append(f"{feature}_percentile")
            self.lime_explainer = LimeTabularExplainer(
                X,
                feature_names=percentile_names,
                mode='classification',
                class_names=['Normal', 'Anomaly'],
                discretize_continuous=True
            )
        else:  # default: discretized
            self.lime_explainer = LimeTabularExplainer(
                X,
                feature_names=self.feature_names,
                mode='classification',
                class_names=['Normal', 'Anomaly'],
                discretize_continuous=True
            )
    
    def explain_anomaly(self, record_index, anomaly_score, method='isolation_forest'):
        """Generate LIME explanation for a specific anomaly"""
        if self.lime_explainer is None or self.data is None:
            return None
        
        # Get the original (unscaled) data point
        X_original = self.data.iloc[record_index][self.feature_names].values
        X_original = np.array([float(str(x).replace('$', '').replace(',', '')) if x is not None else 0.0 for x in X_original])
        
        # Create a simple anomaly classifier based on the method
        if method == 'isolation_forest' and self.iso_forest is not None:
            def anomaly_predictor(X):
                X_scaled = self.scaler.transform(X)
                scores = self.iso_forest.decision_function(X_scaled)
                # Convert to probabilities (higher score = more normal)
                probs = np.zeros((len(scores), 2))
                probs[:, 0] = 1 / (1 + np.exp(-scores))  # Normal probability
                probs[:, 1] = 1 - probs[:, 0]  # Anomaly probability
                return probs
        else:
            # Fallback simple predictor
            def anomaly_predictor(X):
                probs = np.zeros((len(X), 2))
                probs[:, 0] = 0.3  # Normal probability
                probs[:, 1] = 0.7  # Anomaly probability
                return probs
        
        # Generate explanation
        explanation = self.lime_explainer.explain_instance(
            X_original,
            anomaly_predictor,
            num_features=len(self.feature_names)
        )
        
        # Extract feature contributions
        feature_contributions = explanation.as_list()
        
        # Get prediction probabilities
        probabilities = anomaly_predictor(X_original.reshape(1, -1))[0]
        
        # Format explanation
        explanation_data = {
            'record_index': record_index,
            'anomaly_score': float(anomaly_score),
            'prediction_probabilities': {
                'normal': float(probabilities[0]),
                'anomaly': float(probabilities[1])
            },
            'feature_contributions': [
                {
                    'feature': contrib[0],
                    'contribution': float(contrib[1]),
                    'value': float(X_original[self.feature_names.index(contrib[0].split(' ')[0])]) if contrib[0].split(' ')[0] in self.feature_names else 0.0
                }
                for contrib in feature_contributions
            ],
            'feature_values': {
                feature: float(X_original[i]) for i, feature in enumerate(self.feature_names)
            }
        }
        
        return explanation_data
    
    def calculate_feature_importance(self, anomalies, scores):
        """Calculate overall feature importance across all anomalies"""
        if len(anomalies) == 0:
            return {}
        
        # Calculate mean absolute values for anomalous records
        anomaly_indices = np.where(anomalies == 1)[0]
        if len(anomaly_indices) == 0:
            return {}
        
        anomaly_data = self.scaled_data[anomaly_indices]
        normal_data = self.scaled_data[anomalies == 0]
        
        if len(normal_data) == 0:
            return {}
        
        # Calculate difference in means
        anomaly_means = np.mean(anomaly_data, axis=0)
        normal_means = np.mean(normal_data, axis=0)
        
        importance = np.abs(anomaly_means - normal_means)
        
        # Normalize importance scores
        if np.sum(importance) > 0:
            importance = importance / np.sum(importance)
        
        return {
            feature: float(importance[i]) 
            for i, feature in enumerate(self.feature_names)
        }

def main():
    """Main function to handle ML analysis requests"""
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'No command provided'}))
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == 'analyze':
        # Parse input data and parameters
        input_data = json.loads(sys.stdin.read())
        
        data = input_data.get('data', [])
        params = input_data.get('parameters', {})
        
        # Extract parameters with defaults
        contamination = params.get('contamination', 0.1)
        n_neighbors = params.get('n_neighbors', 20)
        anomaly_threshold = params.get('anomaly_threshold', 0.5)
        
        # Limit data for prototype (max 100 records)
        if len(data) > 100:
            data = data[:100]
        
        # Initialize ML detector
        detector = MLAnomalyDetector()
        
        try:
            # Preprocess data
            X_original, X_scaled = detector.preprocess_data(data)
            
            # Run anomaly detection
            iso_anomalies, iso_scores = detector.run_isolation_forest(contamination)
            lof_anomalies, lof_scores = detector.run_local_outlier_factor(n_neighbors, contamination)
            
            # Setup LIME explainer
            detector.setup_lime_explainer(X_original)
            
            # Combine results (record is anomaly if detected by either method)
            combined_anomalies = np.logical_or(iso_anomalies, lof_anomalies).astype(int)
            combined_scores = (np.abs(iso_scores) + np.abs(lof_scores)) / 2
            
            # Apply user-defined threshold
            threshold_anomalies = (combined_scores > anomaly_threshold).astype(int)
            
            # Calculate feature importance
            feature_importance = detector.calculate_feature_importance(combined_anomalies, combined_scores)
            
            # Prepare results
            results = []
            for i, (record, is_anomaly, score) in enumerate(zip(data, threshold_anomalies, combined_scores)):
                if is_anomaly:
                    results.append({
                        'record_index': i,
                        'record_id': record.get('id', i),
                        'corp_name': record.get('corpName', 'Unknown'),
                        'corp_id': record.get('corpId', 'Unknown'),
                        'anomaly_score': float(score),
                        'detection_method': 'Combined (Isolation Forest + LOF)',
                        'record_data': record
                    })
            
            # Sort by anomaly score (highest first)
            results.sort(key=lambda x: x['anomaly_score'], reverse=True)
            
            response = {
                'success': True,
                'total_records': len(data),
                'anomalies_detected': len(results),
                'anomaly_rate': len(results) / len(data) if len(data) > 0 else 0,
                'parameters_used': {
                    'contamination': contamination,
                    'n_neighbors': n_neighbors,
                    'anomaly_threshold': anomaly_threshold
                },
                'feature_importance': feature_importance,
                'anomalies': results
            }
            
            print(json.dumps(response))
            
        except Exception as e:
            print(json.dumps({
                'success': False,
                'error': str(e)
            }))
    
    elif command == 'explain':
        # Parse input for explanation request
        input_data = json.loads(sys.stdin.read())
        
        data = input_data.get('data', [])
        record_index = input_data.get('record_index', 0)
        anomaly_score = input_data.get('anomaly_score', 0.5)
        params = input_data.get('parameters', {})
        
        detector = MLAnomalyDetector()
        
        try:
            # Preprocess data
            X_original, X_scaled = detector.preprocess_data(data)
            
            # Run anomaly detection to setup models
            contamination = params.get('contamination', 0.1)
            detector.run_isolation_forest(contamination)
            detector.setup_lime_explainer(X_original)
            
            # Generate explanation
            explanation = detector.explain_anomaly(record_index, anomaly_score)
            
            if explanation:
                print(json.dumps({
                    'success': True,
                    'explanation': explanation
                }))
            else:
                print(json.dumps({
                    'success': False,
                    'error': 'Could not generate explanation'
                }))
                
        except Exception as e:
            print(json.dumps({
                'success': False,
                'error': str(e)
            }))
    
    else:
        print(json.dumps({'error': 'Unknown command'}))

if __name__ == '__main__':
    main()
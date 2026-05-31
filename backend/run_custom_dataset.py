import pandas as pd
import json
import sys
from fraud.engine import run_all_detectors, build_risk_profiles

def map_csv(file_path):
    df = pd.read_csv(file_path)
    # Map fields conforming to backend format
    df["transaction_id"] = df["transaction_id"]
    df["transaction_date"] = pd.to_datetime(df["timestamp"])
    df["employee_id"] = df["card_id"]
    # Create simple names for employees
    df["employee_name"] = df["card_id"].apply(lambda cid: f"Cardholder {cid.split('_')[1]}" if '_' in str(cid) else str(cid))
    df["merchant_name"] = df["merchant_name"]
    df["amount_usd"] = df["amount"]
    df["amount_cad"] = df["amount"]  # Treat 1:1 for simplicity or map
    # Category to MCC mapping
    cat_to_mcc = {
        "gas": "5541",
        "restaurant": "5812",
        "utilities": "4814",
        "subscription": "5734",
        "online_retail": "5943",
        "grocery": "5411",
        "atm": "6011",
        "entertainment": "7832"
    }
    df["mcc_code"] = df["merchant_category"].map(cat_to_mcc).fillna("0000")
    df["mcc_description"] = df["merchant_category"]
    df["department"] = "Corporate"  # All in one peer group to benchmark
    return df

def main():
    csv_path = "/data/transactions_custom.csv"
    print(f"Loading custom dataset from {csv_path}...")
    df = map_csv(csv_path)
    print(f"Mapped {len(df)} transactions. Running fraud engine...")
    
    # Run all detectors
    flags = run_all_detectors(df)
    print(f"Successfully ran 10 detectors! Found {len(flags)} anomaly/fraud flags.")
    
    # Group by pattern type
    pattern_counts = {}
    for f in flags:
        pattern_counts[f.pattern_type] = pattern_counts.get(f.pattern_type, 0) + 1
        
    print("\n=== FINDINGS BY PATTERN TYPE ===")
    for pat, count in sorted(pattern_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"- {pat}: {count}")
        
    # Print some interesting flags
    print("\n=== ANOMALY EXAMPLES ===")
    printed = 0
    # Sort flags to bring most interesting ones first
    priority = {"BENFORDS_VIOLATION": 0, "SMURFING": 1, "STRUCTURING": 2, "DUPLICATE_EXPENSE": 3, "MERCHANT_CONCENTRATION": 4, "PEER_ANOMALY": 5}
    sorted_flags = sorted(flags, key=lambda f: priority.get(f.pattern_type, 10))
    for f in sorted_flags:
        if f.pattern_type in priority:
            print(f"[{f.pattern_type} - {f.severity}] {f.description}")
            printed += 1
            if printed >= 15:
                break
                
    # Build risk profiles
    print("\n=== COMPUTING COMPOSITE RISK PROFILES ===")
    # Empty policy violation counts since we don't have custom policies loaded for this unlabelled data
    profiles = build_risk_profiles(df, flags, {})
    
    print("\n=== TOP 10 HIGHEST RISK CARDHOLDERS ===")
    for i, p in enumerate(profiles[:10], 1):
        print(f"{i}. {p.employee_name} ({p.employee_id}) - Score: {p.composite_score} ({p.risk_tier})")
        print(f"   Signals: {p.top_signals}")
        print("-" * 50)

if __name__ == "__main__":
    main()

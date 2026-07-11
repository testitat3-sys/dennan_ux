import json
import os
import pandas as pd


def clean_barcode(val):
    if pd.isna(val) or val == "":
        return None
    val = str(val).strip()
    if val.endswith(".0"):
        val = val[:-2]
    return val


def verify_barcodes(excel_path, json_paths):
    json_barcodes = set()
    for json_path in json_paths:
        if os.path.exists(json_path):
            with open(json_path, "r", encoding="utf-8") as f:
                try:
                    data = json.load(f)
                    for item in data:
                        if "barcode" in item and item["barcode"]:
                            json_barcodes.add(str(item["barcode"]).strip())
                        elif "navcode" in item and item["navcode"]:
                            json_barcodes.add(str(item["navcode"]).strip())
                except json.JSONDecodeError:
                    print(f"Error reading JSON file: {json_path}")
        else:
            print(f"Warning: JSON file not found: {json_path}")

    excel_barcodes = set()
    if not os.path.exists(excel_path):
        print(f"File not found: {excel_path}")
        return

    try:
        # Load without headers
        df = pd.read_excel(excel_path, header=None)
    except Exception:
        try:
            df = pd.read_csv(excel_path, header=None)
        except Exception as e:
            print(f"Failed to read file as Excel or CSV: {e}")
            return

    # Extract all values from the first column (index 0)
    if 0 in df.columns:
        raw_codes = df[0]
        for raw_code in raw_codes:
            cleaned = clean_barcode(raw_code)
            if cleaned and cleaned.isdigit():
                excel_barcodes.add(cleaned)
    else:
        print("Error: Could not read the first column of the spreadsheet.")
        return

    missing_barcodes = excel_barcodes - json_barcodes

    print(f"Total unique barcodes in spreadsheet: {len(excel_barcodes)}")
    print(f"Total unique barcodes in JSON datasets: {len(json_barcodes)}")

    if missing_barcodes:
        print(f"\nValidation failed: {len(missing_barcodes)} barcode(s) from the spreadsheet are missing in the JSON files:")
        for barcode in sorted(missing_barcodes):
            print(f" - {barcode}")
    else:
        print("\nValidation passed: All spreadsheet barcodes are present in the JSON files.")


excel_file = "all dennan stock.xls"
json_files = ["convex_products.json", "close_matches_with_details.json"]

if __name__ == "__main__":
    verify_barcodes(excel_file, json_files)
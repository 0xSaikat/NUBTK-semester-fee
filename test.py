import pandas as pd
import json

def process_payment_data(excel_file):
    try:
        
        df = pd.read_excel(excel_file, skiprows=5, engine='xlrd')
        
        
        df = df.dropna(how='all')
        
        
        def clean_number(value):
            if pd.isna(value):
                return 0
            if isinstance(value, str):
                return float(value.replace(',', ''))
            return float(value)
        
        
        formatted_data = []
        
        for _, row in df.iterrows():
            if pd.notna(row['Student ID']):  
                student_data = {
                    'id': str(int(row['Student ID'])),
                    'name': str(row['Student Full Name']).strip(),
                    'totalReceived': clean_number(row['Total Received']),
                    'scholarshipPercentage': clean_number(row['Scholar ']),
                    'creditsTaken': clean_number(row['Credit Taken']),
                    'regFee': clean_number(row['Reg Fee']),
                    'tuitionFee': clean_number(row['Tuition Fee']),
                    'scholarship': clean_number(row['Scholarship']),
                    'others': clean_number(row['Others']),
                    'netPayable': clean_number(row['Net Payable']),
                    'previousDues': clean_number(row['Previous Dues']),
                    'totalPayable': clean_number(row['Total   Payable']),
                    'receivedAmount': clean_number(row['Received Amount']),
                    'dues': clean_number(row['100% Dues Last Date: 03/02/2025']),
                    'remarks': str(row['Remarks']) if pd.notna(row['Remarks']) else ''
                }
                formatted_data.append(student_data)
        
        
        with open('payment_data.json', 'w', encoding='utf-8') as f:
            json.dump(formatted_data, f, indent=2, ensure_ascii=False)
        
        print(f"Successfully processed {len(formatted_data)} student records")
        print("Data saved to payment_data.json")
        
        
        return formatted_data[:3]

    except Exception as e:
        print(f"Error processing file: {str(e)}")
        raise

if __name__ == "__main__":
    try:
        sample_data = process_payment_data('pay.xls')
        print("\nSample of processed data (first 3 records):")
        print(json.dumps(sample_data, indent=2, ensure_ascii=False))
    except Exception as e:
        print(f"Detailed error information:")
        import traceback
        traceback.print_exc()

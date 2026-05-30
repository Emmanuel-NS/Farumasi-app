content = open('c:/Users/PC/Farumasi-app/farumasi_patient_portal/src/app/(patient)/store/page.tsx', encoding='utf-8').read()
idx = content.find('store_full_details')
while idx != -1:
    print(repr(content[idx:idx+80]))
    idx = content.find('store_full_details', idx+1)

import sys
file_path = 'lib/screens/home_screen.dart'
try:
    with open(file_path, 'r', encoding='utf-8') as f:
        text = f.read()

    text = text.replace(r"\'Upload Prescription\'", "'Upload Prescription'")
    text = text.replace(r"\'Please log in to upload a prescription.\'", "'Please log in to upload a prescription.'")
    text = text.replace(r"\'Settings\'", "'Settings'")
    text = text.replace(r"\'Terms & Conditions\'", "'Terms & Conditions'")

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(text)
    print('Fixed quotes')
except Exception as e:
    print(e)

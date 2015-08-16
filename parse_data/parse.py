import csv

# list modified from http://www.geonames.org/countries/
with open("europe_without_russia_fips.txt") as file_handle:
    europe_fips = [row.strip() for row in file_handle]

column_names = [
    "USAF", "WBAN", "STATION NAME", "CTRY", "ST", "CALL", "LAT", "LON",
    "ELEV(M)", "BEGIN", "END"
]

def get_start_of_columns(header_row, column_names):
    start_of_columns = [
        header_row.find(column_name) for column_name in column_names
    ]
    # this doesn't work for "ST"
    start_of_columns[4] = 48
    return start_of_columns

def parse_row(start_of_columns):
    parsed_row = []
    for i, column_start in enumerate(start_of_columns):
        try:
            column_end = start_of_columns[i+1]
        except IndexError:
            column_end = -1
        parsed_row.append(row[column_start:column_end].strip())
    return parsed_row

with open("isd-history.txt") as file_handle:
    for row in file_handle:
        if row[:4] == "USAF":
            start_of_columns = get_start_of_columns(row, column_names)
            break
    parsed_data = [column_names] 
    for row in file_handle:
        parsed_row = parse_row(start_of_columns)
        country_code = parsed_row[3]
        if country_code in europe_fips:
            parsed_data.append(parsed_row)

with open("../europe.csv", "wb") as file_handle:
   writer = csv.writer(file_handle)
   writer.writerows(parsed_data)

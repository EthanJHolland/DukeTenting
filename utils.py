import json
from csv import DictWriter, DictReader
from datetime import datetime, timedelta, date

#conversions to/from datetime objects
def sToDT(s):
    return datetime.strptime(s, '%m/%d/%Y %H:%M')

def sToT(s):
    return datetime.strptime(s, '%I:%M %p').time()

def sToYear(s):
    return str(sToDT(s).year)

def dtToS(dt):
    return dt.strftime('%m/%d/%Y %H:%M')

def dtToUnix(dt):
    return int(dt.timestamp())

def unixToDT(unix):
    return datetime.fromtimestamp(unix)

def dtToMidnight(dt): #return new dt representing midnight at the beginning of the passed day
    return dt.replace(hour=0, minute=0, second=0)

def unixToMidnight(unix):
    return dtToUnix(dtToMidnight(unixToDT(unix)))

def dtToWeekStart(dt): #return new dt representing midnight between saturday and sunday of the week of the passed dt
    return dtToMidnight(dt) - timedelta(days=dt.weekday()+1) #python week starts on monday

#basic read in and write out out
def readData(filename):
    with open(filename) as f:
        return [row for row in DictReader(f)]

def writeData(filename, data):
    with open(filename, 'w') as f:
        w = DictWriter(f, list(data[0].keys()), lineterminator='\n')
        w.writeheader()
        w.writerows(data)

def writeJSON(filename, data): 
    with open(filename,'w') as f:
        f.write(json.dumps(data, indent=1))
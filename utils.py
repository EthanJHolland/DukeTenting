from csv import DictWriter, DictReader
from datetime import datetime, timedelta, date

#conversions to/from datetime objects
def sToDT(s):
    return datetime.strptime(s, '%m/%d/%Y %H:%M')

def sToT(s):
    return datetime.strptime(s, '%I:%M %p').time()

def dtToS(dt):
    return dt.strftime('%m/%d/%Y %H:%M')

def dtToUnix(dt):
    return int(dt.timestamp())

def unixToDT(unix):
    return datetime.fromtimestamp(unix)

def dtToMidnight(dt): #return new dt representing midnight of the passed day
    return dt.replace(hour=0, minute=0, second=0)

#basic read in and write out out
def readData(filename):
    with open(filename) as f:
        return [row for row in DictReader(f)]

def writeData(filename, data):
    with open(filename, 'w') as f:
        w = DictWriter(f, list(data[0].keys()), lineterminator='\n')
        w.writeheader()
        w.writerows(data)
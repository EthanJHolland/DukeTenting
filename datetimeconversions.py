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
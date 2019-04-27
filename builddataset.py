import requests
from datetime import datetime, timedelta, date

from utils import *

DAY_LENGTH = 60*60*24 #length of a day in seconds
YEARS = ['2015', '2016', '2017', '2018', '2019']
PERIODS=['black','blue','white']
DOW = ['mon','tues','wed','thurs','fri','sat','sun'] #python uses 0 for monday
PPL = {
    'black_day': 2,
    'black_night': 10,
    'blue_day': 1,
    'blue_night': 6,
    'white_day': 1,
    'white_night': 2
}

def main():
    verify_grace() #ensure datasets are valid
    data = {year:{} for year in YEARS} #init
    data = weatherToJSON(tentchecksToJSON(datesToJSON(data))) #collect other data
    weatherDict = getWeatherDict() #dict for looking up weather

    for year,yearData in data.items():
        yearData['year'] = year #redundantly store year
        yearData['days'] = []
        
        tcEvents = {tc['startingtime'] for tc in yearData['tentchecks']}.union({tc['endingtime'] for tc in yearData['tentchecks']})
        periodEvents = {yearData['periods'][key] for key in ['black_start','blue_start','white_start','white_end']}
        nightEvents = {night for night in yearData['nights']}

        currDay = unixToMidnight(yearData['periods']['black_start']) #start at midnight of day of start of black tenting
        endTime = unixToMidnight(yearData['periods']['white_end']) + DAY_LENGTH
        yearData['startday'] = unixToDT(currDay).day #the day of the month that tenting starts

        #init
        people = 0 #start with no one in tent
        isNight = None
        inTent = True #don't start in tent
        periodIndex = -1 #index in PERIODs array
        done = False #is tenting 
        weather = None #current weather (nearest hour)

        #summary vars
        totalPeopleSecs = 0
        totalPrecip = 0
        totalTemp = 0

        while currDay < endTime:
            curr = currDay
            peopleSec = blackSec = blueSec = whiteSec = 0
            while curr < currDay + DAY_LENGTH:
                if curr in weatherDict:
                    weather = weatherDict[curr]

                if inTent and not done:
                    peopleSec += people
                    if PERIODS[periodIndex] == 'black':
                        blackSec += people
                    elif PERIODS[periodIndex] == 'blue':
                        blueSec += people
                    elif PERIODS[periodIndex] == 'white':
                        whiteSec += people
                    totalPeopleSecs += people
                    
                    totalPrecip += float(weather['Precipitation'])*people
                    totalTemp += float(weather['Temperature'])*people
                
                #hackily handle the first day/night value since 11 am is always day
                if isNight is None and curr - currDay > DAY_LENGTH*11/24:
                    isNight = False
                
                #handle events
                if curr in tcEvents:
                    inTent = not inTent #toggle in tent
                if curr in periodEvents:
                    periodIndex += 1
                    done = periodIndex >= len(PERIODS) #done with tenting
                    people = calcPeople(periodIndex, isNight)
                if curr in nightEvents and isNight is not None:
                    isNight = not isNight #toggle night
                    people = calcPeople(periodIndex, isNight)

                curr+=1

            yearData['days'].append({
                'midnight': currDay,
                'peoplehours': peopleSec/60/60,
                'blackhours': blackSec/60/60,
                'bluehours': blueSec/60/60,
                'whitehours': whiteSec/60/60
            })
            currDay += DAY_LENGTH #go to next day

        print(year, totalPeopleSecs/60/60/12, totalPrecip/totalPeopleSecs, totalTemp/totalPeopleSecs, sep=',')
        # print('finished',year) #write out
    
    # only keep needed keys
    keep = ['tentchecks', 'weather', 'days', 'startday', 'year']
    data = {yr: {k:v for k,v in data[yr].items() if k in keep} for yr in data}
    writeJSON('./vis/data.json', data)

def calcPeople(periodIndex, isNight):
    if periodIndex < 0 or periodIndex >= len(PERIODS): #before or after tenting
        return 0
    return PPL["{}_{}".format(PERIODS[periodIndex], 'night' if isNight else 'day')]

def verify_grace():
    dts=[]
    with open('textalerts.csv') as f:
        for row in DictReader(f):
            dts.append(datetime.strptime(row['Start'], '%m/%d/%Y %H:%M'))
            dts.append(datetime.strptime(row['End'], '%m/%d/%Y %H:%M'))
    
    #check that sequence of starts and ends is sequential
    for i in range(1,len(dts)):
        assert dts[i]>dts[i-1], 'invalid sequence of grace times'

def getWeatherDict():
    return {dtToUnix(sToDT(row['DateTime'])):row for row in readData('weather.csv')}

def datesToJSON(out = {year:{} for year in YEARS}):
    periodEventKeys = [per+'_start' for per in PERIODS] + ['white_end']
    nightEventKeys = [day+'_start' for day in DOW] + [day+'_end' for day in DOW]

    for k in out:
        out[k]['dates'] = {}
    for row in readData('dates.csv'):
        out[row['year']]['periods'] = {k:dtToUnix(sToDT(v)) for k,v in row.items() if k in periodEventKeys}

        #calculate night starts and ends
        nights = []
        nightOffsets = [float(v) for k,v in row.items() if k in nightEventKeys]
        currWeek = dtToWeekStart(sToDT(row['black_start'])) - timedelta(weeks=2)
        endWeek = dtToWeekStart(sToDT(row['white_end'])) + timedelta(weeks=2)
        while currWeek <= endWeek:
            nights += [dtToUnix(currWeek + timedelta(hours=no)) for no in nightOffsets]
            currWeek += timedelta(weeks=1)
        out[row['year']]['nights'] = nights
    
    return out

def weatherToJSON(out = {year:{} for year in YEARS}):
    #add/overwrite keys
    for k in out:
        out[k]['weather'] = []
    for obj in readData('weather.csv'):
        out[sToYear(obj['DateTime'])]['weather'].append({
            'hour': dtToUnix(sToDT(obj['DateTime'])),
            'temperature': float(obj['Temperature'])
        })
    return out

def tentchecksToJSON(out = {year:{} for year in YEARS}):
    #add/overwrite keys
    for k in out:
        out[k]['tentchecks'] = []
    for tc in readData('textalerts.csv'):
        out[sToYear(tc['Start'])]['tentchecks'].append({
            'startingtime': dtToUnix(sToDT(tc['Start'])),
            'endingtime': dtToUnix(sToDT(tc['End'])),
            'message': tc['Message']
        })

    return out

if __name__=='__main__':
    main()

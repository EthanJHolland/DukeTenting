import json
import requests
from datetime import datetime, timedelta, date

from utils import *
from tentingstate import TentingState

YEARS = ['2015', '2016', '2017', '2018', '2019']
KEY = 'c909476300cb0941ad8617163cb84a5a' #darksky key
LAT = 35.997500 #kville latitude
LONG = -78.940947 #kville longitude
WEATHER_KEYS = {'summary':'Weather','temperature':'Temperature','apparentTemperature':'ApparentTemperature','precipIntensity':'Precipitation','precipType':'PrecipitationType'} #map from api key to desired key
NO_PRECIP = 'none' #string for no precipitation
PRECIP_TYPES = ['rain','snow','sleet',NO_PRECIP] #possible values for precipType

def main():
    data = []
    ts = TentingState()
    for year in YEARS:
        ts.setYear(year)
        currDay = startDay = dtToMidnight(ts.getTentingStart()) #start at midnight of day of start of black tenting

        while currDay < ts.getTentingEnd():
            #do daily tasks
            weatherData = getWeatherData(currDay)
            dayNum = (currDay - startDay).days

            #do hourly tasks
            for hour in weatherData:
                currData = getTimeData(year, hour, dayNum, currDay) #get basic date/time data
                currData.update(weatherData[hour]) #add in weather information
                currData.update(ts.update(hour)) #add in tenting specific data

                data.append(currData) #write data

            currDay += timedelta(days = 1) #go to next day
        
        print('finished',year) #write out
    
    writeData('data.csv', data)

def getTimeData(year, hour, dayNum, currDay):
    return {
            'Year': year,
            'DateTime': dtToS(hour),
            'DayNum': dayNum,
            'HourNum': (hour-currDay).seconds//3600,
        }
                
def getWeatherData(dt):
    url = 'https://api.darksky.net/forecast/{}/{},{},{}?exclude=currently,flags,daily'.format(KEY,LAT,LONG,dtToUnix(dt))
    res = json.loads(requests.get(url).text)

    #clean result
    hours = {}
    for hour in res['hourly']['data']:
        #no precipType key if no precipitation so set to default value
        if 'precipProbability' not in hour or not hour['precipProbability']:
            hour['precipIntensity'] = 0
        if not hour['precipIntensity']:
            hour['precipType'] = NO_PRECIP
        
        hourDT = unixToDT(hour['time'])

        #remove unwanted keys
        hours[hourDT] = {WEATHER_KEYS[k]:v for k,v in hour.items() if k in WEATHER_KEYS}
    
    return hours

if __name__=='__main__':
    main()

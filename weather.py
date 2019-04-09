import json
import requests

from utils import *

YEARS = ['2015', '2016', '2017', '2018', '2019']
KEY = 'c909476300cb0941ad8617163cb84a5a' #darksky key
LAT = 35.997500 #kville latitude
LONG = -78.940947 #kville longitude
WEATHER_KEYS = {'summary':'Weather','temperature':'Temperature','apparentTemperature':'ApparentTemperature','precipIntensity':'Precipitation','precipType':'PrecipitationType'} #map from api key to desired key
NO_PRECIP = 'none' #string for no precipitation
PRECIP_TYPES = ['rain','snow','sleet',NO_PRECIP] #possible values for precipType

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
    writeData('temp.csv', [v for k,v in getWeatherData(sToDT('2/15/2019 0:00')).items()])
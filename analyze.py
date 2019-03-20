from datetimeconversions import *

def main():
    data = readData('data.csv')
    summary = {}

    for hourDict in data:
        if hourDict['Year'] not in summary:
            summary[hourDict['Year']] = {
                'year': hourDict['Year'],
                'hours': 0,
                'minutes': 0,
                'precipitation': 0,
                'rain': 0,
                'sleet': 0,
                'snow': 0,
                'temp': 0,
                'apparent_temp': 0
            }
        
        for k,v in [
            ('hours', 1),
            ('minutes', int(hourDict['MinutesInTent'])),
            ('precipitation', float(hourDict['Precipitation'])),
            ('rain', (hourDict['PrecipitationType']=='rain')*float(hourDict['Precipitation'])),
            ('sleet', (hourDict['PrecipitationType']=='sleet')*float(hourDict['Precipitation'])),
            ('snow', (hourDict['PrecipitationType']=='snow')*float(hourDict['Precipitation'])),
            ('temp', float(hourDict['Temperature'])),
            ('apparent_temp', float(hourDict['ApparentTemperature']))]:

            summary[hourDict['Year']][k] += v
        
    out = [v for k,v in summary.items()]
    for row in out:
        row['nights'] = row['hours']//24/12*6
        row['minutes']/=12
        row['precipitation']/=12
        row['rain']/=12
        row['sleet']/=12
        row['snow']/=12
        row['temp']/=row['hours']
        row['apparent_temp']/=row['hours']
        row['hours']/=12
    writeData('summary.csv', out)

if __name__=='__main__':
    main()
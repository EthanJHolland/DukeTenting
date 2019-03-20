from csv import DictReader
from datetime import datetime, timedelta, date

from datetimeconversions import *

class TentingState():
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
    
    def __init__(self):
        #track period transitions(black, blue, white)
        self.periodEventsDict = self.readInPeriodEvents()
        self.periodIndex = 0

        #track tent checks
        self.checkEvents = self.readInCheckEvents()
        self.checkIndex = 0

        #track day/night transitions
        self.nightEvents = self.readInNightEvents()
        self.isNight = False #initialized in setYear
    
    def setYear(self, year):
        self.year = year
        #TODO: set isNight
    
    def getTentingStart(self):
        return self.periodEventsDict[self.year][0]
    
    def getTentingEnd(self):
        return self.periodEventsDict[self.year][-1]

    def update(self, hourStart):
        hourEnd = hourStart + timedelta(hours=1)
        
        currDT = hourStart
        minsSpent = 0
        numChecks = 0

        while self.checkIndex < len(self.checkEvents) and self.checkEvents[self.checkIndex] < hourEnd:
            if self.checkIndex % 2 == 0:
                #in tent, then check called
                minsSpent += (self.checkEvents[self.checkIndex] - currDT).seconds//60
                numChecks += 1
            
            #update state
            currDT = self.checkEvents[self.checkIndex]
            self.checkIndex += 1
        
        minsSpent += (hourEnd - currDT).seconds//60

        return {
            'MinutesInTent': minsSpent,
            # 'PeopleHours': peopleHours,
            'NumChecks': numChecks
        }

    #get next event
    def nextPeriodEvent(self):
        if self.periodIndex < len(self.periodEventsDict[self.year]):
            return self.periodEventsDict[self.year][self.periodIndex]
        return datetime.now()
    
    def nextCheckEvent(self):
        if self.checkIndex < len(self.checkEvents):
            return self.checkEvents[self.checkIndex]
        return datetime.now()

    def nextNightEvent(self):
        # if self.nightIndex < 
        pass

    #read in events
    def readInPeriodEvents(self):
        periodEventKeys = [per+'_start' for per in TentingState.PERIODS] + ['white_end']
        periodEventsDict = {}

        with open('dates.csv', 'r') as f:
            for row in DictReader(f):
                periodEventsDict[row['year']] = [sToDT(row[k]) for k in periodEventKeys]
        
        return periodEventsDict

    def readInNightEvents(self):
        nightEventKeys = [per+'_start' for per in TentingState.PERIODS] + ['white_end']
        nightEvents = {}
        #TODO: complete method

    def readInCheckEvents(self):
        checkEvents = []
        with open('textalerts.csv') as f:
            for row in DictReader(f):
                for key in ['Start','End']:
                    checkEvents.append(sToDT(row[key]))
        return checkEvents

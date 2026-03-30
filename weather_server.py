from mcp.server.fastmcp import FastMCP
import requests
import os
from dotenv import load_dotenv

load_dotenv()

mcp = FastMCP("weather")
API_KEY = os.getenv("OPENWEATHER_API_KEY")

from geopy.geocoders import Nominatim

geolocator = Nominatim(user_agent="adra_weather_server")

@mcp.tool()
def get_weather(location_name: str) -> str:
    """Get current weather for ANY city, state, or country. Example: 'Rajasthan', 'India', 'London'"""
    if not API_KEY:
        return "Error: OPENWEATHER_API_KEY is not set in your .env file."
    
    try:
        # 1. Resolve location to coordinates
        loc_data = geolocator.geocode(location_name, timeout=10)
        if not loc_data:
            return f"Could not find coordinates for '{location_name}'. Please check the spelling."
        
        # 2. Get weather using coordinates
        lat, lon = loc_data.latitude, loc_data.longitude
        url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={API_KEY}&units=metric"
        response = requests.get(url, timeout=10)
        data = response.json()
        
        if "main" not in data:
            return f"OpenWeather error: {data.get('message', 'Unknown error')}"
            
        temp = data["main"]["temp"]
        desc = data["weather"][0]["description"]
        humidity = data["main"]["humidity"]
        
        return f"The current weather in {loc_data.address} is {temp}°C with {desc}. Humidity: {humidity}%."
    except Exception as e:
        return f"Weather error: {str(e)}"

if __name__ == "__main__":
    mcp.run(transport="stdio")

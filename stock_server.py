from mcp.server.fastmcp import FastMCP
import yfinance as yf

mcp = FastMCP("stock")

# Common name → ticker symbol mappings (especially Indian ETFs & stocks)
NAME_TO_SYMBOL: dict[str, str] = {
    # Nippon / Reliance ETFs
    "nippon gold bees": "GOLDBEES",
    "nippon goldbees": "GOLDBEES",
    "gold bees": "GOLDBEES",
    "goldbees": "GOLDBEES",
    "nippon nifty bees": "NIFTYBEES",
    "nifty bees": "NIFTYBEES",
    "niftybees": "NIFTYBEES",
    "nippon junior bees": "JUNIORBEES",
    "junior bees": "JUNIORBEES",
    "nippon bank bees": "BANKBEES",
    "bank bees": "BANKBEES",
    "nippon liquid bees": "LIQUIDBEES",
    "liquid bees": "LIQUIDBEES",
    "nippon india etf silver": "SILVERBEES",
    "silver bees": "SILVERBEES",
    # SBI ETFs
    "sbi nifty 50 etf": "SETFNIF50",
    "sbi gold etf": "SBIGETS",
    # HDFC ETFs
    "hdfc nifty 50 etf": "HDFCNIFTY",
    "hdfc sensex etf": "HDFCSENSEX",
    # Popular NSE stocks (common names)
    "reliance": "RELIANCE",
    "reliance industries": "RELIANCE",
    "tcs": "TCS",
    "tata consultancy": "TCS",
    "infosys": "INFY",
    "hdfc bank": "HDFCBANK",
    "icici bank": "ICICIBANK",
    "sbi": "SBIN",
    "state bank": "SBIN",
    "wipro": "WIPRO",
    "bharti airtel": "BHARTIARTL",
    "airtel": "BHARTIARTL",
    "itc": "ITC",
    "kotak mahindra": "KOTAKBANK",
    "kotak bank": "KOTAKBANK",
    "axis bank": "AXISBANK",
    "bajaj finance": "BAJFINANCE",
    "maruti": "MARUTI",
    "maruti suzuki": "MARUTI",
    "titan": "TITAN",
    "hul": "HINDUNILVR",
    "hindustan unilever": "HINDUNILVR",
    "tata motors": "TATAMOTORS",
    "tata steel": "TATASTEEL",
    "adani ports": "ADANIPORTS",
    "adani enterprises": "ADANIENT",
    "sunpharma": "SUNPHARMA",
    "sun pharma": "SUNPHARMA",
    "dr reddy": "DRREDDY",
    "ongc": "ONGC",
    "power grid": "POWERGRID",
    "ntpc": "NTPC",
    "bpcl": "BPCL",
    "hero motocorp": "HEROMOTOCO",
    "hero": "HEROMOTOCO",
    # US stocks (common names)
    "apple": "AAPL",
    "microsoft": "MSFT",
    "google": "GOOGL",
    "alphabet": "GOOGL",
    "amazon": "AMZN",
    "tesla": "TSLA",
    "nvidia": "NVDA",
    "meta": "META",
    "facebook": "META",
    "netflix": "NFLX",
}

def resolve_symbol(raw: str) -> str:
    """Resolve a human-friendly name to a ticker symbol using the lookup table."""
    key = raw.lower().strip()
    return NAME_TO_SYMBOL.get(key, raw).upper()

def try_symbol(symbol: str):
    """Try fetching price for a symbol, return price or None."""
    ticker = yf.Ticker(symbol)
    price = ticker.fast_info.get("last_price")
    return price, ticker.fast_info.get("currency", "USD")

@mcp.tool()
def get_stock_price(symbol: str) -> str:
    """
    Get the latest stock price for a given stock name or symbol.
    Supports US stocks (TSLA, AAPL), Indian NSE/BSE stocks (RELIANCE, HDFCBANK),
    and Indian ETFs like Nippon Gold BeES, Nifty BeES, Junior BeES etc.
    You can pass either a ticker symbol or a common name like 'Nippon Gold BeES'.
    """
    # Resolve common names → tickers before querying
    resolved = resolve_symbol(symbol)
    display_name = symbol if symbol.upper() == resolved else f"{symbol} ({resolved})"

    # Suffixes to try: raw → NSE → BSE
    variants = [
        resolved,
        resolved + ".NS",
        resolved + ".BO",
    ]

    for sym in variants:
        try:
            price, currency = try_symbol(sym)
            if price is not None:
                return f"The current price of {display_name} is {price:.2f} {currency}"
        except Exception:
            continue

    return (
        f"Could not find stock price for '{symbol}'. "
        f"Please check the symbol or try the exact NSE/BSE ticker (e.g., GOLDBEES, RELIANCE)."
    )

if __name__ == "__main__":
    mcp.run(transport="stdio")

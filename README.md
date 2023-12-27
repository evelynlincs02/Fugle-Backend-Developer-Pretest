# API Server Implementation

請使⽤ Express、Koa 或 Nest 實作⼀個 API server，可以使⽤任何其他第三⽅套件。

## Part 1：HTTP API

請在 API server 建立以下 HTTP API endpoint：
```
GET http://localhost:3000/data?user=id
```
並完成以下需求：  
- 當 API endpoint 收到請求後，請 fetch 以下位址資料：  
https://hacker-news.firebaseio.com/v0/topstories.json?print=pretty
- 資料獲取成功後，其格式應為數字陣列，請保留陣列中能夠被 `user.id` 整除的資料， 回應的格式將
為 `{ result: number[] }`；若資料獲取失敗，則直接回傳 HTTP status code `500`。


## Part 2：Rate Limiting

將上述 API 加入 rate limiting 功能，請完成以下需求：  
- 每⼀分鐘內，同⼀個 IP 最多請求 10 次；同⼀個⽤⼾（User ID）最多請求 5 次。
- 當請求超過任⼀個次數上限時，請回傳 HTTP status code `429`，並包含 `response body { ip: N1,
id: N2 }`。N1 及 N2 分別為來⾃該 IP 及 User ID 在該分鐘請求的總次數。


## Part 3：WebSocket API

在同⼀個專案建立 WebSocket server，讓⽤⼾可以透過 WebSocket client 建立 WebSocket 連線，如：
```
ws://localhost:3000/streaming
```
並完成以下需求：  
- 在 API server 串接 Bitstamp WebSocket API，取得 **Public channels** 的 **Live ticker** 資料。
- 設計 **WebSocket API**，讓⽤⼾可以透過 **subscribe／unsubscribe** ⽅法取得特定 **10 個 currency
pair**（如 btcusd）的最新成交價格。特定 10 個 currency pair 可隨意選擇。
- 除了直接傳輸 currency pair 的最新成交價格外，⽤⼾可以另外取得 **1 minute OHLC** 資料 (即每分鐘的
第⼀筆／最⾼／最低／最後⼀筆之成交價格)。這些 **OHLC 資料需 保留 15 分鐘**。


## Notes

- 可在本機上準備 **Redis** 環境，指定連線位址：`redis://127.0.0.1:6379`。
- 回傳格式皆為 **JSON**，並可以假定 User ID 為 **1 ~ 1000** 之間的 integer。
- 除 Part 2 需要 **⾃⾏實作** middleware/guard 外，您可以使⽤任意第三⽅套件。
- 您 **不需要** 實作前端介⾯。
- 請從⼀開始建立專案時就 commit，然後 在 GitHub 建立 repository。完成後請回信告知該 repository
在 GitHub 上的位址。
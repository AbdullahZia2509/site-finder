// We'll use dynamic import for node-geocoder since we're in an ES module environment
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const NodeGeocoder = require("node-geocoder");

// The input data provided by the user
const inputData = `
"East Midlands Salaries. £19,400"

"Derbyshire Salaries. £17,100"

"Alfreton Salaries. £18,300"
"Ashbourne Salaries. £17,800"
"Bakewell Salaries. £5,700"
"Belper Salaries. £18,300"
"Bolsover Salaries. £6,600"
"Buxton Salaries. £19,500"
"Chapel-en-le-Frith Salaries. £1,800"
"Chesterfield Salaries. £18,000"
"Clay Cross Salaries. £6,500"
"Derby Salaries. £23,800"
"Dronfield Salaries. £15,400"
"Glossop Salaries. £13,700"

"Heanor Salaries. £22,100"
"Ilkeston Salaries. £20,100"
"Long Eaton Salaries. £18,300"
"Matlock Salaries. £24,000"
"New Mills Salaries. £8,300"
"Ripley Salaries. £21,700"
"Sandiacre Salaries. £30,100"
"Shirebrook Salaries. £10,300"
"Staveley Salaries. £7,500"
"Swadlincote Salaries. £13,900"
Whaley Bridge Salaries. £200

"Leicestershire Salaries. £21,900"

"Ashby-de-la-Zouch Salaries. £19,600"
"Coalville Salaries. £18,400"
"Earl Shilton Salaries. £10,400"
"Hinckley Salaries. £22,800"
"Leicester Salaries. £26,300"
"Loughborough Salaries. £22,000"

"Lutterworth Salaries. £14,400"
"Market Bosworth Salaries. £21,700"
"Market Harborough Salaries. £23,800"
"Melton Mowbray Salaries. £16,300"
"Shepshed Salaries. £10,900"
"Syston Salaries. £21,900"

"Lincolnshire Salaries. £15,400"

"Barton-upon-Humber Salaries. £25,500"
"Boston Salaries. £14,800"
"Bourne Salaries. £12,800"
"Brigg Salaries. £16,700"
"Cleethorpes Salaries. £10,500"
"Gainsborough Salaries. £9,700"
"Grantham Salaries. £15,000"
"Grimsby Salaries. £19,100"
"Heckington Salaries. £5,400"
"Holbeach Salaries. £11,800"
"Horncastle Salaries. £10,000"
"Immingham Salaries. £12,300"
"Lincoln Salaries. £21,200"

Long Sutton Salaries. £900
"Louth Salaries. £11,000"
"Mablethorpe Salaries. £11,000"
"Market Deeping Salaries. £21,000"
"Market Rasen Salaries. £12,400"
"North Hykeham Salaries. £14,800"
"Scunthorpe Salaries. £17,000"
"Skegness Salaries. £15,100"
"Sleaford Salaries. £14,100"
"Spalding Salaries. £19,900"
"Spilsby Salaries. £17,600"
"Stamford Salaries. £21,600"
"Woodhall Spa Salaries. £21,000"

"Northamptonshire Salaries. £20,100"

"Brackley Salaries. £20,700"
"Burton Latimer Salaries. £12,000"
"Corby Salaries. £16,200"
"Daventry Salaries. £19,400"
"Desborough Salaries. £12,400"
"Higham Ferrers Salaries. £5,400"
"Irthlingborough Salaries. £23,000"
"Kettering Salaries. £19,600"

"Northampton Salaries. £26,700"
"Oundle Salaries. £14,300"
"Raunds Salaries. £6,400"
"Rushden Salaries. £17,800"
"Thrapston Salaries. £10,600"
"Towcester Salaries. £20,500"
"Wellingborough Salaries. £19,100"

"Nottinghamshire Salaries. £20,600"

"Arnold Salaries. £11,300"
"Beeston Salaries. £15,100"
"Bingham Salaries. £19,400"
"Cotgrave Salaries. £14,700"
"Eastwood Salaries. £15,900"
"Hucknall Salaries. £13,600"
"Kirkby-in-Ashfield Salaries. £8,900"
"Mansfield Salaries. £17,800"
"Mansfield Woodhouse Salaries. £8,600"

"Market Warsop Salaries. £1,200"
"Newark-on-Trent Salaries. £17,300"
"Nottingham Salaries. £27,200"
"Retford Salaries. £18,700"
"Southwell Salaries. £18,300"
"Stapleford Salaries. £12,100"
"Sutton in Ashfield Salaries. £12,800"
"West Bridgford Salaries. £14,900"
"Worksop Salaries. £14,600"

"Rutland Salaries. £12,300"

"Oakham Salaries. £15,400"

"Uppingham Salaries. £10,700"

"Eastern Salaries. £20,200"

"Bedfordshire Salaries. £20,300"

"Ampthill Salaries. £12,900"
"Bedford Salaries. £26,100"
"Biggleswade Salaries. £13,100"
"Dunstable Salaries. £16,600"
"Houghton Regis Salaries. £14,800"
"Kempston Salaries. £13,500"
"Leighton Buzzard Salaries. £20,700"

"Luton Salaries. £22,800"
"Potton Salaries. £5,100"
"Sandy Salaries. £19,500"
"Shefford Salaries. £13,800"
"Stotfold Salaries. £1,400"
"Woburn Salaries. £9,300"

"Cambridgeshire Salaries. £21,300"

"Cambridge Salaries. £27,800"
"Chatteris Salaries. £14,600"
"Ely Salaries. £21,700"
"Godmanchester Salaries. £11,200"
"Huntingdon Salaries. £17,800"
"March Salaries. £18,200"
"Peterborough Salaries. £22,600"

"Ramsey Salaries. £15,400"
"Soham Salaries. £13,100"
"St Ives Salaries. £18,900"
"St Neots Salaries. £20,700"
"Whittlesey Salaries. £17,800"
"Wisbech Salaries. £10,400"

"Essex Salaries. £19,000"

"Basildon Salaries. £21,100"
"Billericay Salaries. £20,200"
"Braintree Salaries. £17,000"
"Brentwood Salaries. £20,600"
"Brightlingsea Salaries. £4,400"
"Burnham-on-Crouch Salaries. £19,800"
"Canvey Island Salaries. £12,900"
"Chelmsford Salaries. £23,600"
"Chigwell Salaries. £21,900"
"Chipping Ongar Salaries. £23,900"
"Clacton-on-Sea Salaries. £12,900"
"Coggeshall Salaries. £16,500"
"Colchester Salaries. £21,700"
"Corringham Salaries. £17,200"
"Epping Salaries. £18,900"
"Frinton-on-Sea Salaries. £6,200"
"Grays Salaries. £20,400"
"Great Dunmow Salaries. £11,000"
"Halstead Salaries. £7,800"

"Harlow Salaries. £17,800"
"Harwich Salaries. £9,400"
"Loughton Salaries. £26,900"
"Maldon Salaries. £9,200"
"Manningtree Salaries. £10,400"
"Rayleigh Salaries. £16,000"
"Rochford Salaries. £16,400"
"Saffron Walden Salaries. £16,500"
"South Woodham Ferrers Salaries. £9,400"
"Southend-on-Sea Salaries. £20,300"
"Southminster Salaries. £10,400"
"Stansted Mountfitchet Salaries. £23,200"
"Tilbury Salaries. £13,100"
"Waltham Abbey Salaries. £23,600"
"Walton-on-the-Naze Salaries. £15,900"
"Wickford Salaries. £20,200"
"Witham Salaries. £16,100"
Wivenhoe Salaries. £300

"Hertfordshire Salaries. £22,100"

"Baldock Salaries. £10,200"
"Berkhamsted Salaries. £16,300"
"Bishop's Stortford Salaries. £26,800"
"Borehamwood Salaries. £24,300"
"Buntingford Salaries. £19,300"
"Bushey Salaries. £15,000"
"Cheshunt Salaries. £13,600"
"Chorleywood Salaries. £13,000"
"Harpenden Salaries. £22,200"
"Hatfield Salaries. £21,300"
"Hemel Hempstead Salaries. £24,100"
"Hertford Salaries. £24,600"
"Hitchin Salaries. £20,400"
"Hoddesdon Salaries. £18,600"

"Letchworth Salaries. £25,300"
"Potters Bar Salaries. £22,900"
"Radlett Salaries. £16,700"
"Rickmansworth Salaries. £28,600"
"Royston Salaries. £18,500"
"Sawbridgeworth Salaries. £25,100"
"St Albans Salaries. £27,700"
"Stevenage Salaries. £23,600"
"Tring Salaries. £20,400"
"Waltham Cross Salaries. £21,800"
"Ware Salaries. £17,700"
"Watford Salaries. £26,200"
"Welwyn Garden City Salaries. £20,800"

"Norfolk Salaries. £17,600"

"Attleborough Salaries. £16,300"
"Aylsham Salaries. £17,900"
"Caister-on-Sea Salaries. £21,100"
"Cromer Salaries. £15,400"
"Dereham Salaries. £9,700"
"Diss Salaries. £15,400"
"Downham Market Salaries. £14,600"
"Fakenham Salaries. £13,600"
"Gorleston-on-Sea Salaries. £8,900"
"Great Yarmouth Salaries. £20,300"
"Harleston Salaries. £21,000"

"Hingham Salaries. £68,100"
"Holt Salaries. £16,900"
"Hunstanton Salaries. £20,800"
"King's Lynn Salaries. £17,200"
"North Walsham Salaries. £17,700"
"Norwich Salaries. £22,800"
"Sheringham Salaries. £17,000"
"Swaffham Salaries. £11,400"
"Thetford Salaries. £18,200"
"Watton Salaries. £5,200"
"Wymondham Salaries. £15,400"

"Suffolk Salaries. £16,200"

"Aldeburgh Salaries. £2,600"
"Beccles Salaries. £20,700"
"Brandon Salaries. £32,700"
"Bungay Salaries. £7,800"
"Bury St Edmunds Salaries. £18,300"
"Clare Salaries. £15,400"
"Eye Salaries. £11,000"
"Felixstowe Salaries. £13,700"
"Hadleigh Salaries. £8,500"
"Halesworth Salaries. £16,900"
"Haverhill Salaries. £17,900"

"Ipswich Salaries. £21,100"
"Leiston Salaries. £19,700"
"Lowestoft Salaries. £19,100"
"Mildenhall Salaries. £13,000"
"Needham Market Salaries. £13,800"
"Newmarket Salaries. £17,600"
"Saxmundham Salaries. £16,800"
"Southwold Salaries. £18,900"
"Stowmarket Salaries. £14,200"
"Sudbury Salaries. £15,300"
"Woodbridge Salaries. £15,000"

"London Salaries. £28,900"

"City of London Salaries. £54,000"

"London Salaries. £55,900"

"London Salaries. £19,000"

"Acton Salaries. £21,700"
"Barking Salaries. £13,000"
"Barnes Salaries. £29,900"
"Barnet Salaries. £15,200"
"Battersea Salaries. £20,600"
"Beckenham Salaries. £24,700"
"Bermondsey Salaries. £19,000"
"Bethnal Green Salaries. £10,200"
"Bexley Salaries. £16,200"
"Bow Salaries. £14,300"
"Brentford Salaries. £23,200"
"Camberwell Salaries. £15,600"
"Camden Town Salaries. £34,200"
"Carshalton Salaries. £6,000"
"Catford Salaries. £20,400"
"Chelsea Salaries. £24,000"
"Chingford Salaries. £19,500"
"Chislehurst Salaries. £11,400"
"Chiswick Salaries. £27,000"
"Clapham Salaries. £16,100"
"Coulsdon Salaries. £14,400"
"Crayford Salaries. £29,100"
"Croydon Salaries. £22,700"
"Dagenham Salaries. £14,900"
"Deptford Salaries. £12,100"
"East Ham Salaries. £16,700"
"Edgware Salaries. £20,800"
"Edmonton Salaries. £8,600"
"Eltham Salaries. £14,600"
"Enfield Salaries. £18,900"
"Erith Salaries. £14,100"
"Feltham Salaries. £23,900"
"Finchley Salaries. £23,400"
Friern Barnet Salaries. £200
"Fulham Salaries. £21,800"
"Greenford Salaries. £17,000"
"Greenwich Salaries. £12,600"
"Hackney Salaries. £5,800"
"Hammersmith Salaries. £18,200"
"Hampstead Salaries. £27,500"
"Hampton Salaries. £16,200"
"Harrow Salaries. £17,200"
"Hayes Salaries. £21,100"
"Hendon Salaries. £18,300"
"Hornchurch Salaries. £23,100"
"Hornsey Salaries. £18,500"
"Hounslow Salaries. £16,700"
"Ilford Salaries. £22,000"
"Isleworth Salaries. £18,700"
"Islington Salaries. £10,300"
"Kensington Salaries. £17,200"

"Kenton Salaries. £13,800"
"Kingston upon Thames Salaries. £17,400"
"Lewisham Salaries. £8,700"
"Leyton Salaries. £16,200"
"Merton Salaries. £4,700"
"Mitcham Salaries. £18,400"
"Morden Salaries. £12,700"
"New Malden Salaries. £26,200"
"Northolt Salaries. £10,900"
"Northwood Salaries. £15,000"
"Orpington Salaries. £24,800"
"Paddington Salaries. £23,900"
"Penge Salaries. £25,800"
"Pinner Salaries. £22,200"
"Poplar Salaries. £9,100"
"Purley Salaries. £13,400"
"Putney Salaries. £23,700"
"Rainham Salaries. £15,800"
"Richmond Salaries. £20,400"
"Romford Salaries. £20,700"
"Ruislip Salaries. £15,700"
"Sidcup Salaries. £30,500"
"Southall Salaries. £17,900"
"Southgate Salaries. £13,200"
"Southwark Salaries. £12,700"
"Stanmore Salaries. £15,600"
"Stepney Salaries. £5,800"
"Stoke Newington Salaries. £8,900"
"Stratford Salaries. £23,700"
"Streatham Salaries. £13,400"
"Surbiton Salaries. £24,900"
"Teddington Salaries. £19,900"
"Tottenham Salaries. £19,700"
"Twickenham Salaries. £24,200"
"Upminster Salaries. £14,200"
"Uxbridge Salaries. £24,500"
"Wallington Salaries. £12,500"
"Walthamstow Salaries. £18,000"
"Wandsworth Salaries. £12,800"
"Wanstead Salaries. £13,500"
"Wembley Salaries. £23,300"
"West Drayton Salaries. £19,700"
"West Ham Salaries. £4,700"
"Westminster Salaries. £13,400"
"Willesden Salaries. £12,000"
"Wimbledon Salaries. £23,500"
"Wood Green Salaries. £11,100"
"Woodford Salaries. £12,000"
"Woolwich Salaries. £21,000"
"Yiewsley Salaries. £11,600"

"North East Salaries. £15,300"

"Durham Salaries. £14,300"

Annfield Plain Salaries. £700
"Barnard Castle Salaries. £13,200"
"Billingham Salaries. £14,600"
"Bishop Auckland Salaries. £11,600"
"Chester-le-Street Salaries. £12,400"
"Consett Salaries. £11,900"
"Crook Salaries. £12,000"
"Darlington Salaries. £18,600"
"Durham Salaries. £20,900"
"Ferryhill Salaries. £13,500"

"Hartlepool Salaries. £14,300"
"Newton Aycliffe Salaries. £14,400"
"Peterlee Salaries. £7,100"
"Seaham Salaries. £9,200"
"Sedgefield Salaries. £23,100"
"Shildon Salaries. £8,400"
"Spennymoor Salaries. £10,100"
"Stanley Salaries. £15,600"
"Stockton-on-Tees Salaries. £17,800"
"Willington Salaries. £2,800"

"Northumberland Salaries. £10,500"

"Alnwick Salaries. £17,000"
"Amble Salaries. £13,200"
"Ashington Salaries. £9,600"
"Bedlington Salaries. £3,100"
"Berwick-upon-Tweed Salaries. £9,700"
"Blyth Salaries. £10,100"

"Cramlington Salaries. £11,600"
"Haltwhistle Salaries. £25,400"
"Hexham Salaries. £9,400"
"Morpeth Salaries. £8,700"
"Ponteland Salaries. £1,600"
"Prudhoe Salaries. £12,000"

"Tyne and Wear Salaries. £16,800"

"Blaydon Salaries. £11,800"
"Gateshead Salaries. £15,500"
"Hebburn Salaries. £11,700"
"Hetton-le-Hole Salaries. £2,600"
"Houghton-le-Spring Salaries. £10,300"
"Jarrow Salaries. £10,300"
"Longbenton Salaries. £6,900"
"Newcastle upon Tyne Salaries. £22,800"

"Ryton Salaries. £4,100"
"South Shields Salaries. £8,800"
"Sunderland Salaries. £17,100"
"Tynemouth Salaries. £2,700"
"Wallsend Salaries. £12,800"
"Washington Salaries. £12,700"
"Whitburn Salaries. £1,900"
"Whitley Bay Salaries. £10,100"

"North West Salaries. £20,500"

"Cheshire Salaries. £16,700"

"Alsager Salaries. £19,800"
"Bollington Salaries. £15,700"
"Chester Salaries. £21,300"
"Congleton Salaries. £14,500"
"Crewe Salaries. £17,200"
"Ellesmere Port Salaries. £13,200"
"Frodsham Salaries. £11,300"
"Knutsford Salaries. £25,600"
"Lymm Salaries. £12,900"
"Macclesfield Salaries. £16,000"
"Middlewich Salaries. £15,700"

"Nantwich Salaries. £17,200"
"Neston Salaries. £12,000"
"Northwich Salaries. £16,900"
"Poynton Salaries. £1,700"
"Runcorn Salaries. £16,900"
"Sandbach Salaries. £8,400"
"Warrington Salaries. £20,700"
"Widnes Salaries. £14,700"
"Wilmslow Salaries. £22,100"
"Winsford Salaries. £18,000"

"Cumbria Salaries. £17,600"

"Alston Salaries. £20,800"
"Ambleside Salaries. £7,500"
"Appleby-in-Westmorland Salaries. £12,500"
"Barrow-in-Furness Salaries. £23,400"
"Brampton Salaries. £18,700"
"Carlisle Salaries. £21,000"
"Cockermouth Salaries. £9,900"
"Dalton-in-Furness Salaries. £18,400"
"Egremont Salaries. £18,700"
"Grange-over-Sands Salaries. £6,000"
"Kendal Salaries. £20,400"

"Keswick Salaries. £10,300"
"Kirkby Lonsdale Salaries. £19,000"
"Longtown Salaries. £1,700"
"Maryport Salaries. £20,400"
"Penrith Salaries. £14,700"
"Sedbergh Salaries. £29,000"
"Ulverston Salaries. £16,900"
"Whitehaven Salaries. £14,900"
"Wigton Salaries. £13,300"
"Windermere Salaries. £6,900"
"Workington Salaries. £15,600"

"Greater Manchester Salaries. £24,200"

"Altrincham Salaries. £27,100"
"Ashton-in-Makerfield Salaries. £23,300"
"Ashton-under-Lyne Salaries. £12,000"
"Atherton Salaries. £15,300"
"Bolton Salaries. £21,700"
"Bramhall Salaries. £8,100"
"Bury Salaries. £18,700"
"Chadderton Salaries. £16,800"
"Cheadle Salaries. £21,400"
"Cheadle Hulme Salaries. £19,300"
"Denton Salaries. £18,500"
"Droylsden Salaries. £8,300"
"Dukinfield Salaries. £41,700"
"Eccles Salaries. £22,000"
"Failsworth Salaries. £15,100"
"Farnworth Salaries. £15,100"
"Gatley Salaries. £10,500"
"Golborne Salaries. £17,500"
"Hale Salaries. £13,800"
"Hazel Grove Salaries. £4,800"
"Heywood Salaries. £14,600"
"Hindley Salaries. £1,000"
"Horwich Salaries. £18,500"
"Hyde Salaries. £19,600"
"Ince-in-Makerfield Salaries. £21,000"
"Irlam Salaries. £18,000"
"Kearsley Salaries. £9,200"
"Lees Salaries. £7,300"
"Little Lever Salaries. £7,200"

"Littleborough Salaries. £16,700"
"Manchester Salaries. £29,500"
"Marple Salaries. £9,400"
"Middleton Salaries. £9,000"
"Milnrow Salaries. £10,200"
"Mossley Salaries. £15,600"
"Oldham Salaries. £19,400"
"Partington Salaries. £13,500"
"Radcliffe Salaries. £10,800"
"Ramsbottom Salaries. £14,900"
"Rochdale Salaries. £16,300"
"Romiley Salaries. £11,500"
"Royton Salaries. £6,300"
"Sale Salaries. £15,700"
"Salford Salaries. £21,400"
"Shaw Salaries. £10,000"
"Stalybridge Salaries. £11,700"
"Standish Salaries. £16,900"
"Stockport Salaries. £21,800"
"Stretford Salaries. £20,500"
"Swinton Salaries. £15,300"
"Tyldesley Salaries. £12,100"
"Urmston Salaries. £11,800"
"Walkden Salaries. £13,600"
"Westhoughton Salaries. £10,600"
"Whitefield Salaries. £8,500"
"Wigan Salaries. £19,200"
"Worsley Salaries. £11,300"

"Lancashire Salaries. £18,300"

"Accrington Salaries. £17,300"
"Adlington Salaries. £15,000"
"Bacup Salaries. £11,100"
"Bamber Bridge Salaries. £10,400"
"Barnoldswick Salaries. £10,900"
"Barrowford Salaries. £4,900"
"Blackburn Salaries. £25,800"
"Blackpool Salaries. £21,700"
"Brierfield Salaries. £15,000"
"Burnley Salaries. £20,700"
"Carnforth Salaries. £19,600"
"Chorley Salaries. £17,800"
"Church Salaries. £22,900"
"Clayton-le-Moors Salaries. £8,600"
"Cleveleys Salaries. £12,000"
"Clitheroe Salaries. £16,000"
"Colne Salaries. £19,000"
"Darwen Salaries. £14,800"
"Fleetwood Salaries. £12,300"
"Freckleton Salaries. £5,000"

"Fulwood Salaries. £8,800"
"Garstang Salaries. £16,700"
"Great Harwood Salaries. £10,500"
"Haslingden Salaries. £16,900"
"Heysham Salaries. £18,700"
"Kirkham Salaries. £11,000"
"Lancaster Salaries. £21,600"
"Leyland Salaries. £14,700"
"Longridge Salaries. £8,300"
"Lytham St Anne's Salaries. £10,200"
"Morecambe Salaries. £19,800"
"Nelson Salaries. £14,800"
"Ormskirk Salaries. £16,100"
"Oswaldtwistle Salaries. £16,600"
"Poulton-le-Fylde Salaries. £12,300"
"Preston Salaries. £22,500"
"Rawtenstall Salaries. £13,700"
"Rishton Salaries. £16,900"
"Skelmersdale Salaries. £15,500"
"Thornton Salaries. £8,600"

"Merseyside Salaries. £19,000"

Bebington Salaries. £100
"Birkenhead Salaries. £18,100"
"Bootle Salaries. £10,700"
"Crosby Salaries. £6,000"
"Formby Salaries. £11,400"
"Haydock Salaries. £11,900"
"Heswall Salaries. £14,500"
"Kirkby Salaries. £13,300"
"Litherland Salaries. £9,400"

"Liverpool Salaries. £23,200"
"Maghull Salaries. £3,700"
"Newton-le-Willows Salaries. £15,000"
"Prescot Salaries. £11,800"
"Southport Salaries. £15,300"
"St Helens Salaries. £17,100"
"Wallasey Salaries. £8,900"
"West Kirby Salaries. £2,900"

"South East Salaries. £21,400"

"Berkshire Salaries. £24,900"

"Bracknell Salaries. £21,800"
"Crowthorne Salaries. £15,400"
"Eton Salaries. £22,600"
"Hungerford Salaries. £17,000"
"Maidenhead Salaries. £28,200"
"Newbury Salaries. £21,600"
"Reading Salaries. £29,000"

"Sandhurst Salaries. £12,300"
"Slough Salaries. £25,500"
"Thatcham Salaries. £17,700"
"Windsor Salaries. £24,000"
"Wokingham Salaries. £20,900"
"Woodley Salaries. £5,600"

"Buckinghamshire Salaries. £21,600"

"Amersham Salaries. £20,600"
"Aylesbury Salaries. £22,300"
"Beaconsfield Salaries. £21,300"
"Bletchley Salaries. £17,000"
"Buckingham Salaries. £20,100"
"Chesham Salaries. £17,200"
"Gerrards Cross Salaries. £23,000"
"High Wycombe Salaries. £25,600"

"Marlow Salaries. £16,000"
"Milton Keynes Salaries. £27,000"
"Newport Pagnell Salaries. £15,800"
"Olney Salaries. £38,900"
"Princes Risborough Salaries. £20,600"
"Wendover Salaries. £10,700"
"Winslow Salaries. £12,300"
"Woburn Sands Salaries. £25,000"

"East Sussex Salaries. £18,400"

"Battle Salaries. £11,100"
"Bexhill Salaries. £18,400"
"Brighton and Hove Salaries. £22,800"
"Crowborough Salaries. £15,800"
"Eastbourne Salaries. £15,600"
"Hailsham Salaries. £12,400"
"Hastings Salaries. £15,800"
"Heathfield Salaries. £20,900"
"Lewes Salaries. £19,100"

"Newhaven Salaries. £13,600"
"Peacehaven Salaries. £17,300"
"Polegate Salaries. £7,400"
"Portslade-by-Sea Salaries. £13,400"
"Rye Salaries. £15,300"
"Seaford Salaries. £29,000"
"Uckfield Salaries. £18,400"
"Wadhurst Salaries. £21,600"

"Hampshire Salaries. £20,900"

"Aldershot Salaries. £21,700"
"Alton Salaries. £14,600"
"Andover Salaries. £12,900"
"Basingstoke Salaries. £26,600"
"Bishop's Waltham Salaries. £19,100"
"Blackwater Salaries. £8,100"
"Bordon Salaries. £13,800"
"Eastleigh Salaries. £19,800"
"Emsworth Salaries. £9,600"
"Fareham Salaries. £21,900"
"Farnborough Salaries. £24,800"
"Fleet Salaries. £26,500"
"Fordingbridge Salaries. £21,000"
"Gosport Salaries. £17,700"
"Havant Salaries. £18,400"

"Hedge End Salaries. £17,900"
"Horndean Salaries. £4,500"
"Lymington Salaries. £19,800"
"New Milton Salaries. £11,700"
"Petersfield Salaries. £26,900"
"Portsmouth Salaries. £24,400"
"Ringwood Salaries. £15,400"
"Romsey Salaries. £17,000"
"Southampton Salaries. £22,700"
"Tadley Salaries. £16,900"
"Totton Salaries. £13,900"
"Whitchurch Salaries. £28,500"
Wickham Salaries. £400
"Winchester Salaries. £24,400"
"Yateley Salaries. £25,000"

"Isle of Wight Salaries. £18,200"

"Cowes Salaries. £26,400"
East Cowes Salaries. £0
"Newport Salaries. £18,200"

"Ryde Salaries. £29,200"
"Sandown Salaries. £12,500"
"Shanklin Salaries. £11,900"

"Kent Salaries. £21,400"

"Ashford Salaries. £20,400"
"Broadstairs Salaries. £15,400"
"Canterbury Salaries. £26,100"
"Chatham Salaries. £25,000"
"Deal Salaries. £12,200"
"Dover Salaries. £17,200"
"Edenbridge Salaries. £22,400"
"Faversham Salaries. £22,200"
"Folkestone Salaries. £19,200"
"Gillingham Salaries. £21,200"
"Gravesend Salaries. £19,800"
"Herne Bay Salaries. £11,200"
"Hythe Salaries. £9,600"
"Lydd Salaries. £20,500"
"Maidstone Salaries. £29,500"
"Margate Salaries. £18,100"
"Minster Salaries. £15,500"
"New Romney Salaries. £4,200"
"Northfleet Salaries. £22,000"

"Paddock Wood Salaries. £19,400"
"Queenborough Salaries. £16,800"
"Ramsgate Salaries. £13,000"
"Rochester Salaries. £23,400"
"Royal Tunbridge Wells Salaries. £24,100"
"Sandwich Salaries. £13,900"
"Sevenoaks Salaries. £26,400"
"Sheerness Salaries. £9,500"
"Sittingbourne Salaries. £20,600"
"Snodland Salaries. £21,800"
"Southborough Salaries. £16,700"
"Swanley Salaries. £23,600"
"Swanscombe Salaries. £8,000"
"Tenterden Salaries. £9,000"
"Tonbridge Salaries. £23,100"
"West Malling Salaries. £27,500"
"Westerham Salaries. £23,800"
"Whitstable Salaries. £17,400"

"Oxfordshire Salaries. £20,200"

"Abingdon-on-Thames Salaries. £20,600"
"Banbury Salaries. £22,500"
"Bicester Salaries. £17,500"
"Burford Salaries. £20,500"
"Carterton Salaries. £8,600"
"Charlbury Salaries. £13,400"
"Chipping Norton Salaries. £21,700"
"Didcot Salaries. £18,500"
"Faringdon Salaries. £17,700"

"Henley-on-Thames Salaries. £20,400"
"Kidlington Salaries. £13,800"
"Oxford Salaries. £25,000"
"Thame Salaries. £26,300"
"Wallingford Salaries. £20,100"
"Wantage Salaries. £20,200"
"Watlington Salaries. £19,900"
"Witney Salaries. £22,800"
"Woodstock Salaries. £17,700"

"Surrey Salaries. £21,900"

"Addlestone Salaries. £17,500"
"Ashford Salaries. £38,200"
"Banstead Salaries. £15,000"
"Camberley Salaries. £23,700"
"Caterham Salaries. £23,300"
"Chertsey Salaries. £22,700"
"Dorking Salaries. £18,400"
"Egham Salaries. £22,800"
"Epsom Salaries. £26,000"
"Esher Salaries. £19,700"
"Farnham Salaries. £22,800"
"Frimley Salaries. £23,900"
"Godalming Salaries. £16,100"

"Guildford Salaries. £27,700"
"Haslemere Salaries. £7,900"
"Horley Salaries. £14,300"
"Leatherhead Salaries. £21,300"
"Oxted Salaries. £15,600"
"Redhill Salaries. £21,700"
"Reigate Salaries. £25,200"
"Staines-upon-Thames Salaries. £24,400"
"Sunbury Salaries. £25,600"
"Walton-on-Thames Salaries. £22,100"
"Warlingham Salaries. £9,800"
"Weybridge Salaries. £22,800"
"Woking Salaries. £23,400"

"West Sussex Salaries. £19,800"

"Arundel Salaries. £10,300"
"Bognor Regis Salaries. £11,500"
"Burgess Hill Salaries. £16,300"
"Chichester Salaries. £20,500"
"Crawley Salaries. £26,000"
Cuckfield Salaries. £0
"East Grinstead Salaries. £17,600"
"Haywards Heath Salaries. £18,900"
"Horsham Salaries. £22,400"

"Littlehampton Salaries. £9,900"
"Midhurst Salaries. £21,600"
"Petworth Salaries. £22,200"
"Selsey Salaries. £10,100"
"Shoreham-by-Sea Salaries. £17,200"
Southwick Salaries. £900
"Steyning Salaries. £7,800"
"Worthing Salaries. £15,500"

"South West Salaries. £19,400"

"Bristol Salaries. £26,300"

"Bristol Salaries. £27,800"

"Cornwall Salaries. £14,200"

"Bodmin Salaries. £15,300"
"Bude Salaries. £5,200"
"Callington Salaries. £21,600"
"Camborne Salaries. £12,800"
"Camelford Salaries. £24,000"
"Falmouth Salaries. £18,900"
"Fowey Salaries. £2,300"
"Hayle Salaries. £11,800"
"Helston Salaries. £14,600"
"Launceston Salaries. £12,700"
"Liskeard Salaries. £17,500"

"Looe Salaries. £21,000"
"Newquay Salaries. £14,600"
"Padstow Salaries. £12,400"
"Penryn Salaries. £20,600"
"Penzance Salaries. £14,600"
"Redruth Salaries. £19,400"
"Saltash Salaries. £14,900"
"St Austell Salaries. £14,500"
"Torpoint Salaries. £16,100"
"Truro Salaries. £19,400"
"Wadebridge Salaries. £19,600"

"Devon Salaries. £17,300"

"Ashburton Salaries. £18,800"
"Axminster Salaries. £18,400"
"Barnstaple Salaries. £21,000"
"Bideford Salaries. £11,800"
"Bovey Tracey Salaries. £6,100"
"Brixham Salaries. £3,200"
"Buckfastleigh Salaries. £2,400"
"Budleigh Salterton Salaries. £12,600"
"Colyton Salaries. £18,100"
"Crediton Salaries. £19,200"
"Cullompton Salaries. £14,700"
"Dartmouth Salaries. £13,900"
"Dawlish Salaries. £7,200"
"Exeter Salaries. £21,700"
"Exmouth Salaries. £6,000"
"Higher Dunstone Salaries. £11,100"
"Holsworthy Salaries. £29,700"
"Honiton Salaries. £14,900"
"Ilfracombe Salaries. £16,400"
"Ivybridge Salaries. £15,600"

"Kingsbridge Salaries. £13,900"
"Moretonhampstead Salaries. £2,900"
"Newton Abbot Salaries. £12,900"
"North Tawton Salaries. £10,900"
"Northam Salaries. £22,000"
"Okehampton Salaries. £21,700"
"Paignton Salaries. £11,900"
"Plymouth Salaries. £21,700"
"Plympton Salaries. £16,400"
"Plymstock Salaries. £4,500"
"Salcombe Salaries. £17,800"
"Seaton Salaries. £15,500"
"Sidmouth Salaries. £16,800"
"South Molton Salaries. £7,800"
"Tavistock Salaries. £14,400"
"Teignmouth Salaries. £9,000"
"Tiverton Salaries. £23,700"
"Topsham Salaries. £8,300"
"Torquay Salaries. £14,300"
"Totnes Salaries. £12,800"

"Dorset Salaries. £16,800"

"Beaminster Salaries. £20,700"
"Blandford Forum Salaries. £12,200"
"Bournemouth Salaries. £23,200"
"Bridport Salaries. £13,600"
"Chickerell Salaries. £6,200"
"Dorchester Salaries. £13,700"
"Ferndown Salaries. £14,100"
"Gillingham Salaries. £11,200"
"Lyme Regis Salaries. £17,900"

"Poole Salaries. £19,800"
"Shaftesbury Salaries. £20,500"
"Sherborne Salaries. £9,300"
"Sturminster Newton Salaries. £14,400"
"Swanage Salaries. £19,300"
"Verwood Salaries. £12,900"
"Wareham Salaries. £15,700"
"Weymouth Salaries. £13,500"
"Wimborne Minster Salaries. £16,200"

"Gloucestershire Salaries. £19,200"

"Cheltenham Salaries. £23,400"
"Chipping Campden Salaries. £31,200"
"Chipping Sodbury Salaries. £9,400"
"Cinderford Salaries. £21,500"
"Cirencester Salaries. £21,700"
"Coleford Salaries. £22,300"
"Dursley Salaries. £8,800"
"Fairford Salaries. £23,700"
"Filton Salaries. £13,100"
"Gloucester Salaries. £22,600"
"Lechlade-on-Thames Salaries. £23,300"
"Lydney Salaries. £23,400"

"Mitcheldean Salaries. £14,600"
"Moreton-in-Marsh Salaries. £18,700"
"Nailsworth Salaries. £24,700"
"Newent Salaries. £16,000"
"Stonehouse Salaries. £20,300"
"Stow-on-the-Wold Salaries. £16,600"
"Stroud Salaries. £21,200"
"Tetbury Salaries. £15,300"
"Tewkesbury Salaries. £18,300"
"Thornbury Salaries. £5,700"
"Wotton-under-Edge Salaries. £21,600"
"Yate Salaries. £13,900"

"Somerset Salaries. £16,300"

"Axbridge Salaries. £15,200"
"Bath Salaries. £22,400"
"Bridgwater Salaries. £17,800"
"Bruton Salaries. £18,500"
"Burnham-on-Sea Salaries. £5,000"
"Castle Cary Salaries. £8,000"
"Chard Salaries. £17,900"
"Clevedon Salaries. £19,400"
"Crewkerne Salaries. £17,400"
"Frome Salaries. £16,800"
"Glastonbury Salaries. £20,700"
"Ilminster Salaries. £10,800"
"Keynsham Salaries. £22,600"
"Langport Salaries. £14,000"
"Midsomer Norton Salaries. £9,800"

"Minehead Salaries. £17,100"
"Nailsea Salaries. £9,500"
"North Petherton Salaries. £13,700"
"Portishead Salaries. £26,100"
"Radstock Salaries. £13,300"
"Shepton Mallet Salaries. £12,300"
"Somerton Salaries. £10,700"
"South Petherton Salaries. £4,300"
"Street Salaries. £7,900"
"Taunton Salaries. £19,700"
"Wellington Salaries. £14,000"
"Wells Salaries. £13,800"
"Weston-Super-Mare Salaries. £19,700"
"Wincanton Salaries. £15,900"
"Yeovil Salaries. £16,300"

"Wiltshire Salaries. £19,600"

"Amesbury Salaries. £9,100"
"Bradford-on-Avon Salaries. £15,700"
"Calne Salaries. £7,900"
"Chippenham Salaries. £24,300"
"Corsham Salaries. £15,200"
"Cricklade Salaries. £18,800"
"Devizes Salaries. £15,500"
"Malmesbury Salaries. £18,000"
"Marlborough Salaries. £12,000"
"Melksham Salaries. £12,800"

"Mere Salaries. £14,200"
"Royal Wootton Bassett Salaries. £19,000"
"Salisbury Salaries. £18,600"
"Swindon Salaries. £23,700"
"Tidworth Salaries. £26,600"
"Trowbridge Salaries. £19,000"
"Warminster Salaries. £16,500"
"Westbury Salaries. £25,200"
"Wilton Salaries. £2,500"

"West Midlands Salaries. £17,100"

"Herefordshire Salaries. £16,600"

"Bromyard Salaries. £8,800"
"Hereford Salaries. £21,500"
"Kington Salaries. £7,300"

"Ledbury Salaries. £14,000"
"Leominster Salaries. £24,100"
"Ross-on-Wye Salaries. £17,400"

"Shropshire Salaries. £16,500"

"Bridgnorth Salaries. £19,400"
"Church Stretton Salaries. £10,000"
"Craven Arms Salaries. £13,500"
"Ellesmere Salaries. £13,800"
"Ludlow Salaries. £31,200"
"Market Drayton Salaries. £17,800"

"Oswestry Salaries. £11,400"
"Shrewsbury Salaries. £17,300"
"Telford Salaries. £23,700"
"Wem Salaries. £14,600"
"Whitchurch Salaries. £9,200"

"Staffordshire Salaries. £17,300"

"Biddulph Salaries. £5,400"
"Burntwood Salaries. £19,300"
"Burton upon Trent Salaries. £19,700"
"Cannock Salaries. £25,000"
"Eccleshall Salaries. £12,400"
"Fazeley Salaries. £4,600"
"Kidsgrove Salaries. £15,400"
"Leek Salaries. £15,800"
"Lichfield Salaries. £25,700"

"Madeley Salaries. £11,100"
"Newcastle-under-Lyme Salaries. £16,500"
"Penkridge Salaries. £14,200"
"Rugeley Salaries. £13,200"
"Stafford Salaries. £19,700"
"Stoke-on-Trent Salaries. £18,200"
"Stone Salaries. £17,900"
"Tamworth Salaries. £19,000"
"Uttoxeter Salaries. £19,600"

"Warwickshire Salaries. £16,500"

"Alcester Salaries. £12,000"
"Atherstone Salaries. £11,300"
"Bedworth Salaries. £6,200"
"Coleshill Salaries. £17,900"
"Henley-In-Arden Salaries. £23,600"
"Kenilworth Salaries. £12,800"
"Nuneaton Salaries. £20,500"

"Royal Leamington Spa Salaries. £21,200"
"Rugby Salaries. £19,400"
"Shipston-on-Stour Salaries. £15,200"
"Southam Salaries. £25,000"
"Stratford-upon-Avon Salaries. £25,300"
"Warwick Salaries. £19,600"
"Whitnash Salaries. £9,700"

"West Midlands Salaries. £35,400"
"Worcestershire Salaries. £18,500"

"Bewdley Salaries. £15,600"
"Bromsgrove Salaries. £24,200"
"Droitwich Spa Salaries. £16,100"
"Evesham Salaries. £15,000"
"Great Malvern Salaries. £13,900"
"Kidderminster Salaries. £19,600"

"Pershore Salaries. £16,400"
"Redditch Salaries. £18,500"
"Stourport-on-Severn Salaries. £14,400"
"Tenbury Wells Salaries. £17,600"
"Worcester Salaries. £23,200"

"Yorkshire and the Humber Salaries. £19,300"

"East Riding of Yorkshire Salaries. £15,700"

"Beverley Salaries. £18,700"
"Bridlington Salaries. £9,500"
"Cottingham Salaries. £2,800"
"Driffield Salaries. £15,500"
"Goole Salaries. £21,800"
"Hedon Salaries. £29,000"
"Hessle Salaries. £22,200"

"Hornsea Salaries. £15,200"
"Howden Salaries. £12,000"
"Hull Salaries. £19,600"
"Market Weighton Salaries. £20,700"
"Pocklington Salaries. £14,700"
"Withernsea Salaries. £14,500"

"North Yorkshire Salaries. £17,200"

"Bedale Salaries. £21,700"
"Boroughbridge Salaries. £13,800"
"Filey Salaries. £9,900"
"Guisborough Salaries. £9,300"
"Harrogate Salaries. £21,100"
"Helmsley Salaries. £10,400"
"Knaresborough Salaries. £23,400"
"Leyburn Salaries. £9,400"
"Malton Salaries. £24,800"
"Masham Salaries. £18,600"
"Middlesbrough Salaries. £18,200"
"Northallerton Salaries. £16,900"
"Pickering Salaries. £16,400"
"Redcar Salaries. £16,100"

"Richmond Salaries. £24,000"
"Ripon Salaries. £15,300"
Saltburn-by-the-Sea Salaries. £300
"Scarborough Salaries. £13,100"
"Selby Salaries. £17,900"
"Settle Salaries. £13,500"
"Skipton Salaries. £17,300"
"Tadcaster Salaries. £21,400"
"Thirsk Salaries. £17,800"
"Thornaby-on-Tees Salaries. £14,600"
"Whitby Salaries. £17,000"
"Yarm Salaries. £7,200"
"York Salaries. £22,400"

"South Yorkshire Salaries. £19,400"

"Barnsley Salaries. £20,100"
"Bentley Salaries. £18,800"
"Bolton Upon Dearne Salaries. £11,900"
"Dinnington Salaries. £6,800"
"Doncaster Salaries. £17,500"
"Maltby Salaries. £5,200"
"Mexborough Salaries. £17,000"

"Penistone Salaries. £13,300"
"Rotherham Salaries. £20,200"
"Sheffield Salaries. £22,900"
"Stocksbridge Salaries. £21,900"
"Thorne Salaries. £22,000"
"Wath upon Dearne Salaries. £9,700"
"Wombwell Salaries. £23,500"

"West Yorkshire Salaries. £22,000"

"Baildon Salaries. £12,100"
"Batley Salaries. £14,900"
"Bingley Salaries. £17,100"
"Bradford Salaries. £21,600"
"Brighouse Salaries. £18,100"
"Castleford Salaries. £24,000"
"Cleckheaton Salaries. £14,700"
"Dewsbury Salaries. £12,700"
"Elland Salaries. £17,100"
"Garforth Salaries. £22,200"
"Guiseley Salaries. £15,700"
"Halifax Salaries. £18,500"
"Hebden Bridge Salaries. £7,700"
"Heckmondwike Salaries. £3,900"
"Hemsworth Salaries. £7,300"
"Holmfirth Salaries. £11,000"
"Horsforth Salaries. £17,800"
"Huddersfield Salaries. £20,200"
"Ilkley Salaries. £15,600"
"Keighley Salaries. £19,500"

"Knottingley Salaries. £18,100"
"Leeds Salaries. £28,400"
"Liversedge Salaries. £9,700"
"Mirfield Salaries. £17,300"
"Morley Salaries. £16,500"
"Normanton Salaries. £12,800"
"Ossett Salaries. £13,900"
"Otley Salaries. £20,000"
"Pontefract Salaries. £16,700"
"Pudsey Salaries. £15,200"
"Rothwell Salaries. £13,700"
"Shipley Salaries. £20,100"
"Silsden Salaries. £16,700"
"South Elmsall Salaries. £8,700"
"South Kirkby Salaries. £7,800"
"Sowerby Bridge Salaries. £25,700"
"Todmorden Salaries. £10,300"
"Wakefield Salaries. £19,100"
"Wetherby Salaries. £20,200"
"Yeadon Salaries. £19,200"
`;

// Configure the geocoder with OpenStreetMap Nominatim
const options = {
  provider: "mapbox",
  apiKey:
    "pk.eyJ1IjoiYWJkdWxsYWh6aWEwOSIsImEiOiJjbWJncjhweDcwMjRoMnZzODJnZ3Z4NGluIn0.suiaxiuSk_p_6NAeZ8mmRQ", // Replace with your actual API key
  formatter: null,
};

const geocoder = NodeGeocoder(options);

/**
 * Parses the input data string into an array of objects.
 * Each object will have 'location' and 'salary' properties.
 * @param {string} dataString - The raw input data string.
 * @returns {Array<Object>} An array of parsed data objects.
 */
function parseInputData(dataString) {
  const lines = dataString.trim().split("\n");
  const parsedData = [];
  const regex = /"?(.*?)\sSalaries\.\s£([\d,]+)"?/; // Regex to capture location and salary

  for (const line of lines) {
    const match = line.match(regex);
    if (match) {
      const location = match[1].trim();
      const salary = parseInt(match[2].replace(/,/g, ""), 10); // Remove commas and convert to integer
      parsedData.push({ location, salary });
    }
  }
  return parsedData;
}

/**
 * Adds longitude and latitude to each location in the data using a geocoding service.
 * Includes a delay between requests to respect API rate limits.
 * @param {Array<Object>} data - An array of data objects with 'location' and 'salary'.
 * @returns {Promise<Array<Object>>} A promise that resolves to the data with added coordinates.
 */
async function geocodeLocations(data) {
  const geocodedData = [];
  for (const item of data) {
    const query = `${item.location}, United Kingdom`; // Add "United Kingdom" for better accuracy
    console.log(`Geocoding: ${query}...`);
    try {
      const res = await geocoder.geocode(query);
      if (res && res.length > 0) {
        const { latitude, longitude } = res[0]; // Take the first result
        geocodedData.push({
          ...item,
          latitude: latitude,
          longitude: longitude,
        });
        console.log(
          `Found: ${item.location} -> Lat: ${latitude}, Lon: ${longitude}`
        );
      } else {
        geocodedData.push({
          ...item,
          latitude: null,
          longitude: null,
          error: "No coordinates found",
        });
        console.warn(`No coordinates found for: ${item.location}`);
      }
    } catch (error) {
      geocodedData.push({
        ...item,
        latitude: null,
        longitude: null,
        error: `Geocoding error: ${error.message}`,
      });
      console.error(`Error geocoding ${item.location}: ${error.message}`);
    }
    // Pause for a short period to avoid hitting rate limits (e.g., 1 second per request for Nominatim)
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return geocodedData;
}

// Function to convert data to CSV format
function convertToCSV(data) {
  // Define CSV header
  const header = ['location', 'salary', 'latitude', 'longitude'].join(',');
  
  // Map each data item to a CSV row
  const rows = data.map(item => {
    return [
      `"${item.location}"`, // Wrap location in quotes to handle commas
      item.salary,
      item.latitude || '',
      item.longitude || ''
    ].join(',');
  });
  
  // Combine header and rows
  return [header, ...rows].join('\n');
}

// Main execution function
async function main() {
  console.log("Starting geocoding process...");
  const parsedData = parseInputData(inputData);
  const results = await geocodeLocations(parsedData);

  // Convert results to CSV format
  const csvContent = convertToCSV(results);
  
  // Write to file using the fs module
  const fs = await import('fs');
  const outputPath = './uk_salaries_geocoded.csv';
  
  fs.writeFileSync(outputPath, csvContent);
  console.log(`\nGeocoding completed! Data saved to ${outputPath}`);
  console.log(`Total locations processed: ${results.length}`);
}

main();

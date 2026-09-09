import re

data = open('dumped_dom.html', encoding='utf-8').read()
idx2 = data.find('Агрономический протокол')
if idx2 != -1:
    idx1 = data.rfind('<div class="flex flex-col gap-4', 0, idx2)
    print("MATCH LENGTH:", idx2 - idx1)
    print("--- HTML START ---")
    print(data[idx1:idx2])
    print("--- HTML END ---")
else:
    print("Header not found")
